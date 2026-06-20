import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    supabase.from('recipes').select('id', { count: 'exact', head: true })
      .then(({ error, count }) => {
        if (error) setStatus(`error: ${error.message}`)
        else setStatus(`connected — ${count ?? 0} recipes`)
      })
  }, [])

  return (
    <div style={{
      minHeight: '100dvh', background: '#0c0c14', color: '#e2e0ff',
      fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32 }}>myrecipes</div>
      <div style={{ color: '#6b6a8f', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>your personal recipe book</div>
      <div style={{
        marginTop: 16, padding: '10px 16px', borderRadius: 10,
        background: '#13131f', border: '1px solid #1f1f35',
        color: '#a78bfa', fontFamily: "'DM Mono', monospace", fontSize: 12,
      }}>
        Supabase: {status}
      </div>
    </div>
  )
}

export default App
