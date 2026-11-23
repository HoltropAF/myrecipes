// GET /api/recipe-from-link?url=<recipe page>
//
// Fetches a recipe page on the app's behalf (a browser may not read other sites
// itself) and returns the recipe as a filled-in template, using the recipe data
// most sites embed for search engines. No AI and no key involved; see
// src/lib/recipeFromPage.js. Only the template is returned, never the page.
//
// Responses: 200 { title, template, ingredientCount, stepCount }
//            400 { error: 'bad-url' }       not an http(s) link, or a private address
//            422 { error: 'no-recipe' }     page has no usable recipe data
//            502 { error: 'unreachable' }   the site refused, timed out or failed

import { Buffer } from 'node:buffer'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { recipeTemplateFromHtml } from '../src/lib/recipeFromPage.js'

const MAX_BYTES = 3_000_000
const TIMEOUT_MS = 9000
const MAX_REDIRECTS = 4

// Never fetch our own network or cloud metadata addresses (server-side request forgery).
function isPrivateAddress(address) {
  if (isIP(address) === 6) {
    const a = address.toLowerCase()
    if (a === '::1' || a === '::' || a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80')) return true
    const mapped = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateAddress(mapped[1]) : false
  }
  const [p, q] = address.split('.').map(Number)
  return p === 10 || p === 127 || p === 0 || (p === 169 && q === 254) || (p === 172 && q >= 16 && q <= 31) ||
    (p === 192 && q === 168) || (p === 100 && q >= 64 && q <= 127) || p >= 224
}

async function checkUrl(raw) {
  let url
  try { url = new URL(raw) } catch { return null }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (!addresses.length || addresses.some(a => isPrivateAddress(a.address))) return null
  return url
}

async function fetchPage(startUrl) {
  let url = startUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; myrecipes-import/1.0; +https://github.com/HoltropAF/myrecipes)',
        accept: 'text/html,application/xhtml+xml',
      },
    })
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      // Check every hop again: a public page may redirect to a private address.
      url = await checkUrl(new URL(response.headers.get('location'), url).href)
      if (!url) throw new Error('bad-url')
      continue
    }
    if (!response.ok) throw new Error('unreachable')
    const reader = response.body.getReader()
    const chunks = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_BYTES) { await reader.cancel(); break }
      chunks.push(value)
    }
    return { html: new TextDecoder().decode(Buffer.concat(chunks)), finalUrl: url.href }
  }
  throw new Error('unreachable')
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })
  const url = await checkUrl(String(req.query.url || ''))
  if (!url) return res.status(400).json({ error: 'bad-url' })
  try {
    const { html, finalUrl } = await fetchPage(url)
    const result = recipeTemplateFromHtml(html, finalUrl)
    if (!result) return res.status(422).json({ error: 'no-recipe' })
    return res.status(200).json(result)
  } catch (error) {
    return res.status(error.message === 'bad-url' ? 400 : 502).json({ error: error.message === 'bad-url' ? 'bad-url' : 'unreachable' })
  }
}
