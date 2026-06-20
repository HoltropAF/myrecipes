import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthScreen from './components/AuthScreen'
import AddRecipeWizard from './components/AddRecipeWizard'
import RecipeDetail from './components/RecipeDetail'
import BottomNav from './components/BottomNav'
import AllRecipesView from './components/views/AllRecipesView'
import CookbookView from './components/views/CookbookView'
import ShoppingListView from './components/views/ShoppingListView'
import SettingsView from './components/views/SettingsView'
import './App.css'

function App() {
  const [session, setSession] = useState(undefined)
  const [recipes, setRecipes] = useState([])
  const [showWizard, setShowWizard] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [activeTab, setActiveTab] = useState('recipes')

  // Wrap setters so opening a "screen" (recipe detail, wizard) pushes browser history,
  // and the phone's back button/gesture closes that screen instead of exiting the app.
  const openRecipe = (recipe) => {
    window.history.pushState({ screen: 'recipe' }, '')
    setSelectedRecipe(recipe)
  }
  const openWizard = () => {
    window.history.pushState({ screen: 'wizard' }, '')
    setEditingRecipe(null)
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
    if (window.history.state?.screen === 'wizard') window.history.back()
  }

  useEffect(() => {
    const handlePopState = () => {
      // Back button pressed: close whichever overlay screen is open.
      setSelectedRecipe(null)
      setShowWizard(false)
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
    setLoadingRecipes(true)
    const { data } = await supabase.from('recipes').select('*').order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoadingRecipes(false)
  }

  useEffect(() => {
    if (session) loadRecipes()
  }, [session])

  const handleDelete = async (recipe) => {
    if (!window.confirm(`Delete "${recipe.title}"? This also removes its shopping list items and cook history, and can't be undone.`)) return
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id)
    if (!error) {
      closeRecipe()
      loadRecipes()
    }
  }

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--parchment)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 13 }}>loading…</div>
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  if (showWizard) {
    return (
      <AddRecipeWizard
        existingCategories={[...new Set(recipes.map(r => r.category).filter(Boolean))]}
        existingGroups={[...new Set(recipes.flatMap(r => (r.ingredients || []).map(g => g.group).filter(Boolean)))]}
        existingRecipe={editingRecipe}
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
        onDelete={handleDelete}
        onEdit={openEdit}
      />
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 20 }}>
        {activeTab === 'recipes' && (
          <AllRecipesView
            recipes={recipes}
            loading={loadingRecipes}
            onSelect={openRecipe}
            onAdd={openWizard}
          />
        )}
        {activeTab === 'cookbook' && (
          <CookbookView
            recipes={recipes}
            onSelect={openRecipe}
            onAdd={openWizard}
          />
        )}
        {activeTab === 'shopping' && (
          <ShoppingListView userId={session.user.id} />
        )}
        {activeTab === 'settings' && (
          <SettingsView userEmail={session.user.email} />
        )}
      </div>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

export default App
