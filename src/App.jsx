import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthScreen from './components/AuthScreen'
import './App.css'

function App() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

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

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)', padding: 24 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--tomato-deep)' }}>
        Signed in as {session.user.email}
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ marginTop: 16, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: '#fffdf9', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
      >
        Sign out
      </button>
    </div>
  )
}

export default App
