import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthScreen from './components/AuthScreen'
import AddRecipeWizard from './components/AddRecipeWizard'
import RecipeDetail from './components/RecipeDetail'
import './App.css'

function App() {
  const [session, setSession] = useState(undefined)
  const [recipes, setRecipes] = useState([])
  const [showWizard, setShowWizard] = useState(false)
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)

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

  const handleDelete = async (recipe) => {
    if (!window.confirm(`Delete "${recipe.title}"? This can't be undone.`)) return
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id)
    if (!error) {
      setSelectedRecipe(null)
      loadRecipes()
    }
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
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)' }}>
      <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--tomato-deep)', fontWeight: 600 }}>myrecipes</div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ background: 'none', border: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
        >sign out</button>
      </div>

      <div style={{ padding: '0 20px' }}>
        <button
          onClick={() => setShowWizard(true)}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
            background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)',
            fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 18,
          }}
        >+ Add recipe</button>
      </div>

      <div style={{ padding: '0 20px 100px' }}>
        {loadingRecipes ? (
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 13 }}>loading recipes…</div>
        ) : recipes.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
            No recipes yet — add your first one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recipes.map(r => (
              <div key={r.id} onClick={() => setSelectedRecipe(r)} style={{
                background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--charcoal)' }}>{r.title}</div>
                {r.tagline && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal-soft)', marginTop: 2 }}>{r.tagline}</div>}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 6 }}>
                  {(r.ingredients || []).reduce((s, g) => s + g.items.length, 0)} ingredients · {(r.steps || []).reduce((s, g) => s + g.items.length, 0)} steps
                  {r.category ? ` · ${r.category}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
