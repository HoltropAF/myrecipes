import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const RECIPE_CACHE_PREFIX = 'mr_recipes_v1'

// The offline recipe cache is scoped per user. An unscoped key meant that on a
// shared device the next person to sign in saw the previous user's cookbook
// until their own fetch resolved.
const recipeCacheKey = (userId) => `${RECIPE_CACHE_PREFIX}_${userId}`

function readCachedRecipes(userId) {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(recipeCacheKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeCachedRecipes(userId, recipes) {
  if (!userId) return
  try { localStorage.setItem(recipeCacheKey(userId), JSON.stringify(recipes)) } catch {}
}

// Drop every user's cache (on sign-out), plus the legacy unscoped key.
function clearRecipeCaches() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(RECIPE_CACHE_PREFIX)) localStorage.removeItem(key)
    }
    // Per-recipe ingredient check state, which also grew without bound.
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('recipe_check_')) localStorage.removeItem(key)
    }
  } catch {}
}

// Read the Supabase session synchronously from localStorage so returning
// users skip the splash entirely. Returns null if not logged in, undefined
// if we can't tell (expired token or storage error — fall back to async getSession).
function readStoredSession() {
  try {
    const authKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (!authKey) return null
    const data = JSON.parse(localStorage.getItem(authKey))
    if (!data?.access_token || !data?.user) return null
    // Return the session regardless of expiry. The Supabase SDK will auto-refresh
    // the access token on the first API call using the refresh_token. This avoids
    // showing the gyoza splash for the very common case where the token has simply
    // expired since the last visit (happens every hour).
    return data
  } catch { return undefined }
}
import { LanguageContext, useT } from './lib/i18n'
import { DEMO_RECIPES, DEMO_COOK_LOG, DEMO_MEAL_GROUPS } from './lib/demoData'
import AuthScreen from './components/AuthScreen'
import BottomNav from './components/BottomNav'
import FloatingActionButton from './components/FloatingActionButton'
import AllRecipesView from './components/views/AllRecipesView'
import UndoToast from './components/UndoToast'
import PullToRefresh from './components/PullToRefresh'
import FirstRunWizard from './components/FirstRunWizard'

// Lazy-load heavy views and overlays that aren't needed on the initial screen
const AddRecipeWizard  = lazy(() => import('./components/AddRecipeWizard'))
const RecipeDetail     = lazy(() => import('./components/RecipeDetail'))
const QuickLogCook     = lazy(() => import('./components/QuickLogCook'))
const ShoppingListView = lazy(() => import('./components/views/ShoppingListView'))
const StatsView        = lazy(() => import('./components/views/StatsView'))
const MealPrepView     = lazy(() => import('./components/views/MealPrepView'))
const SettingsView     = lazy(() => import('./components/views/SettingsView'))
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

// Every lazily-loaded screen gets an error boundary as well as a Suspense
// boundary. Without one, a render error (or a chunk 404 after a deploy) leaves
// the user staring at a blank page with no way back.
const LazyScreen = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={null}>{children}</Suspense>
  </ErrorBoundary>
)

function AppInner({ setLanguage }) {
  const { t, lang } = useT()
  const [session, setSession] = useState(readStoredSession)
  const [isGuest, setIsGuest] = useState(false)
  // `session` is already assigned by the time this initializer runs, so the
  // cache is read for the right user on the very first paint.
  const [recipes, setRecipes] = useState(() => readCachedRecipes(session?.user?.id))
  const [cookCounts, setCookCounts] = useState({})
  const [showWizard, setShowWizard] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [editInitialStep, setEditInitialStep] = useState(0)
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [activeTab, setActiveTab] = useState('recipes')
  const [unitSystem, setUnitSystem] = useState('metric')
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [theme, setTheme] = useState('auto') // 'light' | 'dark' | 'auto'
  const [defaultCategory, setDefaultCategory] = useState(null)
  const [recipeViewMode, setRecipeViewMode] = useState('folders') // 'folders' | 'list'
  const [recipeSearchMode, setRecipeSearchMode] = useState('title') // 'title' | 'ingredient'
  const [compactMode, setCompactMode] = useState(false)
  const [prefillCategory, setPrefillCategory] = useState(null)
  const [collections, setCollections] = useState([])
  const [collectionRecipeMap, setCollectionRecipeMap] = useState({})
  const [showAllergenDisclaimer, setShowAllergenDisclaimer] = useState(() => {
    try { return localStorage.getItem('mr_allergen_disclaimer_seen_v1') !== 'true' } catch { return true }
  })
  const dismissAllergenDisclaimer = () => {
    try { localStorage.setItem('mr_allergen_disclaimer_seen_v1', 'true') } catch {}
    setShowAllergenDisclaimer(false)
  }
  const [updateReady, setUpdateReady] = useState(false)
  const [showFirstRun, setShowFirstRun] = useState(false)

  // A new service worker installs but waits (skipWaiting is off in vite.config,
  // so it can't purge the running tab's chunks out from under it). We show the
  // banner, and only activate it when the user says so.
  const waitingWorkerRef = useRef(null)
  const updatingRef = useRef(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Only reload for an update the user actually asked for; otherwise this
      // fires on first install and would reload the app out from under them.
      if (updatingRef.current) window.location.reload()
    })
    navigator.serviceWorker.ready.then(reg => {
      const markWaiting = (worker) => {
        waitingWorkerRef.current = worker
        setUpdateReady(true)
      }
      if (reg.waiting) markWaiting(reg.waiting)
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            markWaiting(newWorker)
          }
        })
      })
    })
  }, [])

  const applyUpdate = () => {
    const waiting = waitingWorkerRef.current
    if (waiting) {
      updatingRef.current = true
      waiting.postMessage({ type: 'SKIP_WAITING' })
      // If the worker never takes over, don't leave the user stuck on a dead
      // banner — reload anyway.
      setTimeout(() => window.location.reload(), 2000)
    } else {
      window.location.reload()
    }
  }

  // Apply the resolved theme (auto = follow system) to the document root
  useEffect(() => {
    const apply = () => {
      const resolved = theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme
      document.documentElement.setAttribute('data-theme', resolved)
    }
    apply()
    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])

  // Wrap setters so opening a "screen" (recipe detail, wizard) pushes browser history,
  // and the phone's back button/gesture closes that screen instead of exiting the app.
  const openRecipe = (recipe) => {
    window.history.pushState({ screen: 'recipe' }, '')
    setSelectedRecipe(recipe)
  }
  const openWizard = (prefill) => {
    window.history.pushState({ screen: 'wizard' }, '')
    setEditingRecipe(null)
    setPrefillCategory(prefill || null)
    setShowWizard(true)
  }
  const TAB_TO_STEP = { info: 3, ingredients: 1, steps: 2, cooklog: 0, storage: 3 }
  const openEdit = (recipe, tab = 'info') => {
    window.history.pushState({ screen: 'wizard' }, '')
    setEditingRecipe(recipe)
    setEditInitialStep(TAB_TO_STEP[tab] ?? 0)
    setShowWizard(true)
  }
  const closeRecipe = () => {
    setSelectedRecipe(null)
    if (window.history.state?.screen === 'recipe') window.history.back()
  }
  const closeWizard = () => {
    setShowWizard(false)
    setEditingRecipe(null)
    setPrefillCategory(null)
    if (window.history.state?.screen === 'wizard') window.history.back()
  }

  useEffect(() => {
    const handlePopState = () => {
      // Back button pressed: close whichever overlay screen is open.
      setSelectedRecipe(null)
      setShowWizard(false)
      setShowQuickLog(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') clearRecipeCaches()
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadRecipes = async () => {
    if (isGuest) {
      setRecipes(DEMO_RECIPES)
      const counts = {}
      for (const entry of DEMO_COOK_LOG) counts[entry.recipe_id] = (counts[entry.recipe_id] || 0) + 1
      setCookCounts(counts)
      return
    }
    setLoadingRecipes(true)
    const [{ data, error }, { data: logData }, { data: tagData }] = await Promise.all([
      supabase.from('recipes').select('*').order('created_at', { ascending: false }),
      supabase.from('cook_log').select('recipe_id'),
      supabase.from('recipe_computed_tags').select('recipe_id, allergen_tags, is_vegan, is_vegetarian, is_pescatarian_or_better'),
    ])
    // A failed fetch (offline, expired refresh token, 5xx) yields data === null.
    // Keep whatever is already on screen and in the cache rather than replacing
    // the cookbook with an empty list and destroying the offline copy.
    if (error || !Array.isArray(data)) {
      setLoadingRecipes(false)
      return
    }
    const tagMap = {}
    for (const row of (tagData || [])) tagMap[row.recipe_id] = row
    const freshRecipes = data.map(r => ({
      ...r,
      allergen_tags: tagMap[r.id]?.allergen_tags || [],
      is_vegan: tagMap[r.id]?.is_vegan ?? false,
      is_vegetarian: tagMap[r.id]?.is_vegetarian ?? false,
      is_pescatarian_or_better: tagMap[r.id]?.is_pescatarian_or_better ?? false,
    }))
    setRecipes(freshRecipes)
    writeCachedRecipes(session?.user?.id, freshRecipes)
    if (Array.isArray(logData)) {
      const counts = {}
      for (const entry of logData) counts[entry.recipe_id] = (counts[entry.recipe_id] || 0) + 1
      setCookCounts(counts)
    }
    setLoadingRecipes(false)
    return freshRecipes
  }

  const loadCollections = async () => {
    if (!session?.user?.id) return
    const [{ data: cols }, { data: links }] = await Promise.all([
      supabase.from('collections').select('*').order('created_at'),
      supabase.from('collection_recipes').select('collection_id, recipe_id'),
    ])
    setCollections(cols || [])
    const map = {}
    for (const { collection_id, recipe_id } of links || []) {
      if (!map[collection_id]) map[collection_id] = new Set()
      map[collection_id].add(recipe_id)
    }
    setCollectionRecipeMap(map)
  }

  const enterGuestMode = () => {
    setIsGuest(true)
    setRecipes(DEMO_RECIPES)
  }

  const exitGuestMode = () => {
    setIsGuest(false)
    setRecipes([])
    setActiveTab('recipes')
  }

  // Keyed on the user id, not the session object. Supabase hands us a brand new
  // session object every time the access token rotates (hourly), which would
  // otherwise re-run these and clobber unsaved Settings edits.
  useEffect(() => {
    if (session) { loadRecipes(); loadCollections() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  useEffect(() => {
    if (isGuest) loadRecipes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest])

  useEffect(() => {
    if (!session || isGuest) return
    supabase.from('user_preferences').select('*').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setShowFirstRun(true)
          return
        }
        if (data.unit_system) setUnitSystem(data.unit_system)
        if (data.theme) setTheme(data.theme)
        if (data.default_category) setDefaultCategory(data.default_category)
        if (data.recipe_view_mode) setRecipeViewMode(data.recipe_view_mode)
        if (data.recipe_search_mode) setRecipeSearchMode(data.recipe_search_mode)
        if (data.compact_mode !== null && data.compact_mode !== undefined) setCompactMode(data.compact_mode)
        if (data.language) setLanguage(data.language)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, isGuest])

  const savePreferences = async (patch) => {
    if (!session || isGuest) return
    await supabase.from('user_preferences').upsert({
      user_id: session.user.id, updated_at: new Date().toISOString(), ...patch,
    })
  }

  const toggleUnitSystem = async () => {
    const next = unitSystem === 'metric' ? 'us' : 'metric'
    setUnitSystem(next)
    savePreferences({ unit_system: next })
  }

  // Batched save from the Settings screen's Save bar — applies every changed
  // setting at once and persists in a single upsert.
  const handleSaveSettings = async (draft) => {
    setTheme(draft.theme)
    setDefaultCategory(draft.defaultCategory)
    setUnitSystem(draft.unitSystem)
    setRecipeViewMode(draft.recipeViewMode)
    setRecipeSearchMode(draft.recipeSearchMode)
    setCompactMode(draft.compactMode)
    if (draft.language) setLanguage(draft.language)
    await savePreferences({
      theme: draft.theme,
      default_category: draft.defaultCategory,
      unit_system: draft.unitSystem,
      recipe_view_mode: draft.recipeViewMode,
      recipe_search_mode: draft.recipeSearchMode,
      compact_mode: draft.compactMode,
      language: draft.language,
    })
  }

  const [setupBannerDismissed, setSetupBannerDismissed] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null) // { recipe, timeoutId }

  const handleDelete = (recipe) => {
    closeRecipe()
    setRecipes(prev => prev.filter(r => r.id !== recipe.id))
    if (isGuest) {
      setPendingDelete({ recipe, timeoutId: setTimeout(() => setPendingDelete(null), 5000) })
      return
    }
    const timeoutId = setTimeout(async () => {
      await supabase.from('recipes').delete().eq('id', recipe.id)
      setPendingDelete(null)
    }, 5000)
    setPendingDelete({ recipe, timeoutId })
  }

  const undoDelete = () => {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timeoutId)
    setRecipes(prev => [pendingDelete.recipe, ...prev])
    setPendingDelete(null)
  }

  const dismissPendingDelete = useCallback(() => setPendingDelete(null), [])

  // Guest mode is read-only for recipe creation/editing. The FAB and Add buttons
  // are hidden for guests as the first line of defence; this closes the wizard if
  // anything still manages to call openWizard. Done in an effect, not during
  // render, so it doesn't fire history.back() twice under StrictMode.
  useEffect(() => {
    if (showWizard && isGuest) closeWizard()
  }, [showWizard, isGuest])

  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'var(--parchment)', gap: 14,
      }}>
        <div style={{ fontSize: 56, animation: 'gyoza-pulse 1.6s ease-in-out infinite' }}>🥟</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: 'var(--tomato-deep)' }}>myrecipes</div>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 12 }}>{t('app.warmingUp')}</div>
        <style>{`
          @keyframes gyoza-pulse {
            0%, 100% { transform: scale(1) rotate(-3deg); opacity: 0.85; }
            50% { transform: scale(1.12) rotate(3deg); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  if (!session && !isGuest) {
    return <AuthScreen onGuest={enterGuestMode} />
  }

  if (showWizard && isGuest) return null

  if (showWizard) {
    return (
      <LazyScreen>
        <AddRecipeWizard
          existingCategories={[...new Set(recipes.map(r => r.category).filter(Boolean))]}
          existingSubcategories={recipes.reduce((map, r) => {
            if (r.category && r.subcategory) {
              if (!map[r.category]) map[r.category] = []
              if (!map[r.category].includes(r.subcategory)) map[r.category].push(r.subcategory)
            }
            return map
          }, {})}
          existingGroups={[...new Set(recipes.flatMap(r => (r.ingredients || []).map(g => g.group).filter(Boolean)))]}
          existingTags={[...new Set(recipes.flatMap(r => r.tags || []))]}
          existingRecipe={editingRecipe}
          initialStep={editingRecipe ? editInitialStep : 0}
          prefillCategory={prefillCategory}
          onClose={closeWizard}
          onSaved={async (updated) => {
            closeWizard()
            // The row returned by .select().single() has no allergen_tags/diet
            // flags — those are merged in from recipe_computed_tags during
            // loadRecipes. Re-select from the refreshed list so the Info tab
            // doesn't lose its badges after an edit.
            const fresh = await loadRecipes()
            if (selectedRecipe) {
              setSelectedRecipe(fresh?.find(r => r.id === updated?.id) || updated)
            }
          }}
        />
      </LazyScreen>
    )
  }

  if (selectedRecipe) {
    return (
      <LazyScreen>
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={closeRecipe}
          onDelete={isGuest ? null : handleDelete}
          onEdit={isGuest ? null : openEdit}
          unitSystem={unitSystem}
          onToggleUnitSystem={toggleUnitSystem}
          isGuest={isGuest}
          collections={isGuest ? [] : collections}
          collectionRecipeMap={isGuest ? {} : collectionRecipeMap}
          onCollectionsChanged={loadCollections}
          onCookLogged={isGuest ? null : loadRecipes}
        />
      </LazyScreen>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)', display: 'flex', flexDirection: 'column' }}>
      {showFirstRun && (
        <FirstRunWizard
          userId={session?.user?.id}
          setLanguage={setLanguage}
          onDone={() => {
            setShowFirstRun(false)
            loadRecipes()
          }}
        />
      )}
      {showAllergenDisclaimer && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '22px 20px', maxWidth: 360, width: '100%',
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 10 }}>
              {t('app.disclaimerTitle')}
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.6, marginBottom: 18 }}>
              {t('app.disclaimerBody')}
            </p>
            <button
              onClick={dismissAllergenDisclaimer}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
              }}
            >{t('app.disclaimerAck')}</button>
          </div>
        </div>
      )}
      {updateReady && (
        <div style={{
          position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 448,
          background: 'var(--card)', border: '1px solid var(--tomato)', borderRadius: 12,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--tomato-deep)' }}>
              {t('app.updateAvailable')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {t('app.updateReady')}{' '}
              <a
                href="https://github.com/HoltropAF/myrecipes/commits/main"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--tomato-deep)', fontWeight: 600 }}
              >{t('app.updateChangelog')}</a>
            </div>
          </div>
          <button
            onClick={() => setUpdateReady(false)}
            style={{ background: 'none', border: 'none', color: 'var(--charcoal-soft)', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
          >×</button>
          <button
            onClick={applyUpdate}
            style={{ background: 'var(--tomato)', border: 'none', borderRadius: 8, color: '#fffdf9', fontSize: 12, fontWeight: 700, padding: '7px 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }}
          >{t('app.updateBtn')}</button>
        </div>
      )}
      {isGuest && !setupBannerDismissed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px 40px 9px 16px', position: 'relative',
          background: 'var(--sage-light)', borderBottom: '1px solid var(--line)',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)',
        }}>
          <span>{t('app.setupPrompt')}</span>
          <a
            href="/setup.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--tomato)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >{t('app.setupLink')}</a>
          <button
            onClick={() => setSetupBannerDismissed(true)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--sage)',
              cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 6px',
              fontFamily: 'inherit',
            }}
          >×</button>
        </div>
      )}
      <PullToRefresh onRefresh={loadRecipes} style={{ flex: 1, overflowY: 'auto', paddingTop: 20 }}>
        {activeTab === 'recipes' && (
          <AllRecipesView
            recipes={recipes}
            loading={loadingRecipes && recipes.length === 0}
            onSelect={openRecipe}
            onAdd={isGuest ? null : openWizard}
            defaultOpenCategory={defaultCategory}
            viewMode={recipeViewMode}
            searchMode={recipeSearchMode}
            compactMode={compactMode}
            cookCounts={cookCounts}
            collections={isGuest ? [] : collections}
            collectionRecipeMap={isGuest ? {} : collectionRecipeMap}
            onCollectionsChanged={loadCollections}
          />
        )}
        {activeTab === 'shopping' && (
          <LazyScreen>
            <ShoppingListView userId={session?.user?.id} isGuest={isGuest} recipes={recipes} />
          </LazyScreen>
        )}
        {activeTab === 'stats' && (
          <LazyScreen>
            <StatsView recipes={recipes} isGuest={isGuest} demoCookLog={isGuest ? DEMO_COOK_LOG : null} />
          </LazyScreen>
        )}
        {activeTab === 'mealprep' && (
          <LazyScreen>
            <MealPrepView recipes={recipes} onSelectRecipe={openRecipe} isGuest={isGuest} demoMealGroups={isGuest ? DEMO_MEAL_GROUPS : null} />
          </LazyScreen>
        )}
        {activeTab === 'settings' && (
          isGuest ? (
            <div style={{ padding: '0 20px 100px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }}>{t('settings.title')}</h1>
              <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.6 }}>
                  {t('app.guestSettingsMsg')}
                </div>
              </div>
              <button
                onClick={exitGuestMode}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--line)',
                  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
              >{t('app.exitGuestBtn')}</button>
            </div>
          ) : (
            <LazyScreen>
              <SettingsView
                userEmail={session.user.email}
                recipes={recipes}
                onRecipesChanged={loadRecipes}
                theme={theme}
                defaultCategory={defaultCategory}
                unitSystem={unitSystem}
                recipeViewMode={recipeViewMode}
                recipeSearchMode={recipeSearchMode}
                compactMode={compactMode}
                language={lang}
                onSavePreferences={handleSaveSettings}
              />
            </LazyScreen>
          )
        )}
      </PullToRefresh>
      {!isGuest && <FloatingActionButton onAddRecipe={openWizard} onLogCook={() => setShowQuickLog(true)} />}
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {showQuickLog && !isGuest && (
        <LazyScreen>
          <QuickLogCook
            recipes={recipes}
            onClose={() => setShowQuickLog(false)}
            onLogged={() => { setShowQuickLog(false); loadRecipes() }}
          />
        </LazyScreen>
      )}

      {pendingDelete && (
        <UndoToast
          message={t('app.deleted')(pendingDelete.recipe.title)}
          onUndo={undoDelete}
          onDismiss={dismissPendingDelete}
        />
      )}
    </div>
  )
}

function App() {
  const [language, setLanguage] = useState('en')
  return (
    <LanguageContext.Provider value={language}>
      <AppInner setLanguage={setLanguage} />
    </LanguageContext.Provider>
  )
}

export default App
