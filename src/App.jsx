import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { DEMO_RECIPES, DEMO_COOK_LOG, DEMO_MEAL_GROUPS } from './lib/demoData'
import AuthScreen from './components/AuthScreen'
import AddRecipeWizard from './components/AddRecipeWizard'
import RecipeDetail from './components/RecipeDetail'
import BottomNav from './components/BottomNav'
import FloatingActionButton from './components/FloatingActionButton'
import QuickLogCook from './components/QuickLogCook'
import AllRecipesView from './components/views/AllRecipesView'
import ShoppingListView from './components/views/ShoppingListView'
import StatsView from './components/views/StatsView'
import MealPrepView from './components/views/MealPrepView'
import SettingsView from './components/views/SettingsView'
import UndoToast from './components/UndoToast'
import PullToRefresh from './components/PullToRefresh'
import './App.css'

function App() {
  const [session, setSession] = useState(undefined)
  const [isGuest, setIsGuest] = useState(false)
  const [recipes, setRecipes] = useState([])
  const [showWizard, setShowWizard] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [activeTab, setActiveTab] = useState('recipes')
  const [unitSystem, setUnitSystem] = useState('metric')
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [theme, setTheme] = useState('auto') // 'light' | 'dark' | 'auto'
  const [defaultCategory, setDefaultCategory] = useState(null)
  const [pinWishlistFirst, setPinWishlistFirst] = useState(false)
  const [prefillCategory, setPrefillCategory] = useState(null)

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
  const openEdit = (recipe) => {
    window.history.pushState({ screen: 'wizard' }, '')
    setEditingRecipe(recipe)
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadRecipes = async () => {
    if (isGuest) {
      setRecipes(DEMO_RECIPES)
      return
    }
    setLoadingRecipes(true)
    const { data } = await supabase.from('recipes').select('*').order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoadingRecipes(false)
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

  useEffect(() => {
    if (session) loadRecipes()
  }, [session])

  useEffect(() => {
    if (isGuest) loadRecipes()
  }, [isGuest])

  useEffect(() => {
    if (!session || isGuest) return
    supabase.from('user_preferences').select('*').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        if (data.unit_system) setUnitSystem(data.unit_system)
        if (data.theme) setTheme(data.theme)
        if (data.default_category) setDefaultCategory(data.default_category)
        if (data.pin_wishlist_first) setPinWishlistFirst(data.pin_wishlist_first)
      })
  }, [session])

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

  const updateTheme = (next) => {
    setTheme(next)
    savePreferences({ theme: next })
  }

  const updateDefaultCategory = (next) => {
    setDefaultCategory(next)
    savePreferences({ default_category: next })
  }

  const updatePinWishlistFirst = (next) => {
    setPinWishlistFirst(next)
    savePreferences({ pin_wishlist_first: next })
  }

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

  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'var(--parchment)', gap: 14,
      }}>
        <div style={{ fontSize: 56, animation: 'gyoza-pulse 1.6s ease-in-out infinite' }}>🥟</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: 'var(--tomato-deep)' }}>myrecipes</div>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 12 }}>warming up the kitchen…</div>
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

  if (showWizard) {
    if (isGuest) {
      // Guest mode is read-only for recipe creation/editing — close immediately,
      // FloatingActionButton and Add buttons are hidden in guest mode anyway as a first line of defense,
      // but this is a safety net in case anything still calls openWizard.
      closeWizard()
      return null
    }
    return (
      <AddRecipeWizard
        existingCategories={[...new Set(recipes.map(r => r.category).filter(Boolean))]}
        existingGroups={[...new Set(recipes.flatMap(r => (r.ingredients || []).map(g => g.group).filter(Boolean)))]}
        existingTags={[...new Set(recipes.flatMap(r => r.tags || []))]}
        existingRecipe={editingRecipe}
        prefillCategory={prefillCategory}
        onClose={closeWizard}
        onSaved={(updated) => { closeWizard(); loadRecipes(); if (selectedRecipe) setSelectedRecipe(updated) }}
      />
    )
  }

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        onClose={closeRecipe}
        onDelete={isGuest ? null : handleDelete}
        onEdit={isGuest ? null : openEdit}
        unitSystem={unitSystem}
        onToggleUnitSystem={toggleUnitSystem}
        isGuest={isGuest}
      />
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)', display: 'flex', flexDirection: 'column' }}>
      {isGuest && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '8px 16px', background: 'var(--sage-light)', borderBottom: '1px solid var(--line)',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)',
        }}>
          <span>👀 Guest mode — browsing a demo cookbook, nothing is saved</span>
          <button
            onClick={exitGuestMode}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 11, flexShrink: 0 }}
          >exit</button>
        </div>
      )}
      <PullToRefresh onRefresh={loadRecipes} style={{ flex: 1, overflowY: 'auto', paddingTop: 20 }}>
        {activeTab === 'recipes' && (
          <AllRecipesView
            recipes={pinWishlistFirst ? [...recipes].sort((a, b) => (b.wishlist === true) - (a.wishlist === true)) : recipes}
            loading={loadingRecipes}
            onSelect={openRecipe}
            onAdd={isGuest ? null : openWizard}
            defaultOpenCategory={defaultCategory}
          />
        )}
        {activeTab === 'shopping' && (
          <ShoppingListView userId={session?.user?.id} isGuest={isGuest} />
        )}
        {activeTab === 'stats' && (
          <StatsView recipes={recipes} isGuest={isGuest} demoCookLog={isGuest ? DEMO_COOK_LOG : null} />
        )}
        {activeTab === 'mealprep' && (
          <MealPrepView recipes={recipes} onSelectRecipe={openRecipe} isGuest={isGuest} demoMealGroups={isGuest ? DEMO_MEAL_GROUPS : null} />
        )}
        {activeTab === 'settings' && (
          isGuest ? (
            <div style={{ padding: '0 20px 100px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }}>Settings</h1>
              <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.6 }}>
                  You're browsing in guest mode. Settings and preferences aren't available until you sign in with a real account.
                </div>
              </div>
              <button
                onClick={exitGuestMode}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--line)',
                  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
              >Exit guest mode</button>
            </div>
          ) : (
            <SettingsView
              userEmail={session.user.email}
              recipes={recipes}
              theme={theme} onThemeChange={updateTheme}
              defaultCategory={defaultCategory} onDefaultCategoryChange={updateDefaultCategory}
              pinWishlistFirst={pinWishlistFirst} onPinWishlistFirstChange={updatePinWishlistFirst}
              unitSystem={unitSystem} onToggleUnitSystem={toggleUnitSystem}
            />
          )
        )}
      </PullToRefresh>
      {!isGuest && <FloatingActionButton onAddRecipe={openWizard} onLogCook={() => setShowQuickLog(true)} />}
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {showQuickLog && !isGuest && (
        <QuickLogCook
          recipes={recipes}
          onClose={() => setShowQuickLog(false)}
          onLogged={() => setShowQuickLog(false)}
        />
      )}

      {pendingDelete && (
        <UndoToast
          message={`"${pendingDelete.recipe.title}" deleted`}
          onUndo={undoDelete}
          onDismiss={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

export default App
