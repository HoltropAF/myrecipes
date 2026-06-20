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
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [activeTab, setActiveTab] = useState('recipes')

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
    if (!window.confirm(`Delete "${recipe.title}"? This can't be undone.`)) return
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id)
    if (!error) {
      setSelectedRecipe(null)
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
        onClose={() => setShowWizard(false)}
        onSaved={() => { setShowWizard(false); loadRecipes() }}
      />
    )
  }

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onDelete={handleDelete}
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
            onSelect={setSelectedRecipe}
            onAdd={() => setShowWizard(true)}
          />
        )}
        {activeTab === 'cookbook' && (
          <CookbookView
            recipes={recipes}
            onSelect={setSelectedRecipe}
            onAdd={() => setShowWizard(true)}
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
