// What this app is holding on the device, and which instance it's talking to.
//
// Two questions a self-hoster always ends up asking — "how much space is this
// taking" and "am I even on the right project" — that the app had no way to
// answer.

export function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// localStorage stores UTF-16, so a rough byte count is 2 per character. Exact
// enough to tell 40 kB from 4 MB, which is the only distinction that matters.
function sizeOf(key, value) {
  return (key.length + (value?.length || 0)) * 2
}

/**
 * Break down our own localStorage keys. Everything the app writes is prefixed,
 * so anything unrecognised is reported separately rather than claimed.
 */
export function readLocalStorageUsage() {
  const buckets = { recipeCache: 0, checkState: 0, flags: 0, other: 0 }
  let total = 0
  try {
    for (const key of Object.keys(localStorage)) {
      const value = localStorage.getItem(key)
      const size = sizeOf(key, value)
      total += size
      if (key.startsWith('mr_recipes_v1')) buckets.recipeCache += size
      else if (key.startsWith('recipe_check_')) buckets.checkState += size
      else if (key.startsWith('mr_')) buckets.flags += size
      else buckets.other += size
    }
  } catch { /* storage disabled — report zeroes rather than crashing Settings */ }
  return { ...buckets, total }
}

/** Cached recipe count, read without deserialising more than we need. */
export function readCachedRecipeCount() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('mr_recipes_v1_')) continue
      const parsed = JSON.parse(localStorage.getItem(key) || '[]')
      if (Array.isArray(parsed)) return parsed.length
    }
  } catch { /* unreadable cache — treated as empty */ }
  return 0
}

/** Total origin usage, which includes the service worker precache and photos. */
export async function readQuotaEstimate() {
  try {
    if (!navigator.storage?.estimate) return null
    const { usage, quota } = await navigator.storage.estimate()
    return { usage: usage || 0, quota: quota || 0 }
  } catch { return null }
}

/**
 * Drop the offline copy. Deliberately does not touch auth — signing the user
 * out as a side effect of "clear cache" would be a nasty surprise.
 */
export function clearLocalCaches() {
  let removed = 0
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('mr_recipes_v1') || key.startsWith('recipe_check_')) {
        localStorage.removeItem(key)
        removed++
      }
    }
  } catch { /* nothing we can do */ }
  return removed
}

/** Also drop the service worker precache, so the next load re-fetches the app. */
export async function clearServiceWorkerCaches() {
  try {
    if (!('caches' in window)) return 0
    const names = await caches.keys()
    await Promise.all(names.map(name => caches.delete(name)))
    return names.length
  } catch { return 0 }
}

/**
 * Which Supabase project this build points at. The URL is the only identifying
 * thing available client-side, and the ref is its first hostname label.
 */
export function readInstanceInfo() {
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  let projectRef = null
  let host = null
  try {
    const parsed = new URL(url)
    host = parsed.host
    projectRef = parsed.hostname.split('.')[0] || null
  } catch { /* unset or malformed — shown as unknown */ }

  return {
    projectRef,
    host,
    // Injected at build time by vite.config.js.
    buildDate: typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : null,
  }
}
