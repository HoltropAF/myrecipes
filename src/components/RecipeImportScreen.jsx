// Import screen: three ways in, from easiest to most manual.
// 1. A recipe website: the app reads the recipe data most sites publish
//    (api/recipe-from-link.js) and shows it in the preview below. No AI.
// 2. Anything else (videos, Instagram, Pinterest): a prompt for the person's own
//    AI chatbot, opened in ChatGPT or Claude with the prompt already filled in;
//    they paste the answer back into the box below.
// 3. Paste or upload a filled-in template (TemplateImportCard), which is also
//    where 1 and 2 end up, so every recipe is previewed before it is saved.

import { useState } from 'react'
import { useT } from '../lib/i18n'
import { recipeImportPrompt } from '../lib/recipeImportPrompt'
import template from '../../docs/recipe-template.txt?raw'
import TemplateImportCard from './TemplateImportCard'

export default function RecipeImportScreen({ recipes, onImported, onClose }) {
  const { lang } = useT()
  const nl = lang === 'nl'
  const [source, setSource] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchNote, setFetchNote] = useState(null) // { ok, text }
  const [fetched, setFetched] = useState(null) // { template, key }
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState('')

  const resetFor = value => { setSource(value); setPrompt(''); setStatus(''); setFetchNote(null) }

  const fetchMessages = {
    'bad-url': nl ? 'Dat lijkt geen geldige websitelink.' : 'That doesn’t look like a valid web link.',
    'no-recipe': nl ? 'Op die pagina staat geen receptinformatie die de app kan lezen. Gebruik hieronder je AI-chatbot.' : 'That page has no recipe information the app can read. Use your AI chatbot below instead.',
    unreachable: nl ? 'De website kon niet worden gelezen (geblokkeerd, achter een login of te traag). Gebruik hieronder je AI-chatbot.' : 'The website couldn’t be read (blocked, behind a login, or too slow). Use your AI chatbot below instead.',
  }

  const fromWebsite = async () => {
    setFetching(true); setFetchNote(null); setFetched(null); setPrompt(''); setStatus('')
    try {
      const res = await fetch(`/api/recipe-from-link?url=${encodeURIComponent(source.trim())}`)
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.template) {
        setFetched({ template: body.template, key: Date.now() })
        setFetchNote({ ok: true, text: nl
          ? `Gevonden: ${body.title} (${body.ingredientCount} ingrediënten, ${body.stepCount} stappen). Controleer het hieronder en importeer.`
          : `Found: ${body.title} (${body.ingredientCount} ingredients, ${body.stepCount} steps). Check it below, then import.` })
      } else setFetchNote({ ok: false, text: fetchMessages[body.error] || fetchMessages.unreachable })
    } catch { setFetchNote({ ok: false, text: fetchMessages.unreachable }) }
    finally { setFetching(false) }
  }

  const preparePrompt = async () => {
    try {
      const text = recipeImportPrompt(source, template)
      setPrompt(text)
      try {
        await navigator.clipboard.writeText(text)
        setStatus(nl ? 'Prompt gekopieerd.' : 'Prompt copied.')
      } catch { setStatus('') }
    } catch (error) { setStatus(error.message) }
  }

  return <main style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 60px', boxSizing: 'border-box' }}>
    <button type="button" onClick={onClose} style={linkBtnStyle}>‹ {nl ? 'Terug' : 'Back'}</button>
    <h1 style={titleStyle}>{nl ? 'Recept importeren' : 'Import recipe'}</h1>
    <p style={introStyle}>{nl ? 'Geen zin om over te typen? Plak een link en laat de app het werk doen. Je ziet altijd eerst een voorbeeld voordat er iets wordt opgeslagen.' : 'Don’t feel like typing? Paste a link and let the app do the work. You always see a preview before anything is saved.'}</p>

    <label style={labelStyle}>{nl ? 'Link naar het recept' : 'Link to the recipe'}
      <input type="url" value={source} onChange={e => resetFor(e.target.value)} placeholder="https://…" style={inputStyle} />
    </label>

    <section style={cardStyle}>
      <h2 style={h2Style}>{nl ? '1. Van een receptenwebsite' : '1. From a recipe website'}</h2>
      <p style={hintStyle}>{nl
        ? 'Werkt met de meeste receptensites en foodblogs: zij zetten het recept ook in een standaardformaat in de pagina. Werkt niet met Instagram, TikTok, YouTube of Pinterest, met pagina’s achter een login of betaalmuur, en met sites die automatische bezoeken blokkeren. Hoeveelheden en eenheden worden overgenomen zoals ze er staan, dus kijk het even na.'
        : 'Works with most recipe websites and food blogs: they also put the recipe in the page in a standard format. It doesn’t work with Instagram, TikTok, YouTube or Pinterest, pages behind a login or paywall, or sites that block automatic visits. Amounts and units are copied as written, so give it a quick check.'}</p>
      <button type="button" onClick={fromWebsite} disabled={!source.trim() || fetching} style={primaryBtnStyle(!source.trim() || fetching)}>
        {fetching ? (nl ? 'Recept ophalen…' : 'Getting recipe…') : (nl ? 'Recept ophalen' : 'Get recipe')}
      </button>
      {fetchNote && <p role="status" style={{ ...noteStyle, color: fetchNote.ok ? 'var(--charcoal)' : 'var(--tomato-deep)', background: fetchNote.ok ? 'var(--sage-light)' : 'var(--parchment-dim)' }}>{fetchNote.text}</p>}
    </section>

    <section style={cardStyle}>
      <h2 style={h2Style}>{nl ? '2. Van een video, Instagram of iets anders' : '2. From a video, Instagram or anything else'}</h2>
      <p style={hintStyle}>{nl
        ? 'Laat je eigen AI-chatbot het recept lezen. Maak de prompt, open hem in ChatGPT of Claude (of plak hem in een andere chatbot) en plak het antwoord in het vak hieronder.'
        : 'Let your own AI chatbot read the recipe. Create the prompt, open it in ChatGPT or Claude (or paste it into any other chatbot), then paste its answer into the box below.'}</p>
      <button type="button" onClick={preparePrompt} disabled={!source.trim()} style={secondaryBtnStyle}>{nl ? 'Prompt maken' : 'Create prompt'}</button>
      {prompt && <>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <a href={`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`} target="_blank" rel="noopener noreferrer" style={secondaryBtnStyle}>{nl ? 'Openen in ChatGPT ↗' : 'Open in ChatGPT ↗'}</a>
          <a href={`https://claude.ai/new?q=${encodeURIComponent(prompt)}`} target="_blank" rel="noopener noreferrer" style={secondaryBtnStyle}>{nl ? 'Openen in Claude ↗' : 'Open in Claude ↗'}</a>
        </div>
        <p role="status" style={hintStyle}>{status ? `${status} ` : ''}{nl ? 'Staat de prompt er niet al in? Plak hem dan zelf.' : 'If the prompt isn’t already filled in there, paste it yourself.'}</p>
        <details><summary style={summaryStyle}>{nl ? 'Prompt bekijken' : 'Show prompt'}</summary>
          <textarea readOnly value={prompt} rows={7} style={{ ...inputStyle, marginTop: 6 }} />
        </details>
      </>}
    </section>

    <TemplateImportCard key={fetched?.key || 'manual'} initialText={fetched?.template || ''} existingRecipes={recipes} onImported={onImported} />
  </main>
}

const titleStyle = { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--tomato-deep)', margin: '10px 0 6px' }
const introStyle = { fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.5, margin: '0 0 14px' }
const labelStyle = { display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 12 }
const inputStyle = { width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '11px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 15 }
const cardStyle = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px', marginBottom: 12 }
const h2Style = { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--charcoal)', margin: '0 0 6px' }
const hintStyle = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', lineHeight: 1.5, margin: '4px 0 10px' }
const noteStyle = { fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.45, padding: '9px 11px', borderRadius: 8, margin: '10px 0 0' }
const summaryStyle = { fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--tomato-deep)', cursor: 'pointer' }
const linkBtnStyle = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--tomato-deep)' }
const secondaryBtnStyle = {
  display: 'inline-block', minHeight: 29, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--tomato)', boxSizing: 'border-box',
  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'none',
}
const primaryBtnStyle = disabled => ({
  width: '100%', padding: '11px 0', borderRadius: 9, border: 'none', background: 'var(--tomato)', color: '#fffdf9',
  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
})
