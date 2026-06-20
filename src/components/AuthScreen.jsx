import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [mode, setMode] = useState('password') // 'password' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'error'|'info', text }
  const [loading, setLoading] = useState(false)

  const handlePasswordAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    const fn = isSignUp ? supabase.auth.signUp : supabase.auth.signInWithPassword
    const { error } = await fn({ email, password })
    setLoading(false)
    if (error) setStatus({ type: 'error', text: error.message })
    else if (isSignUp) setStatus({ type: 'info', text: 'Check your email to confirm your account.' })
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) setStatus({ type: 'error', text: error.message })
    else setStatus({ type: 'info', text: `Link sent to ${email}. Check your inbox.` })
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--parchment)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      {/* Signature element: recipe index card */}
      <div style={{
        width: '100%', maxWidth: 360, background: '#fffdf9',
        border: '1px solid var(--line)', borderRadius: '2px 2px 10px 10px',
        boxShadow: '0 1px 0 var(--line), 0 18px 40px -20px rgba(42,36,32,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* torn/perforated top edge effect */}
        <div style={{
          height: 14, width: '100%',
          backgroundImage: 'radial-gradient(circle at 8px 7px, var(--parchment) 4px, transparent 4.5px)',
          backgroundSize: '16px 14px', backgroundPosition: '0 0',
        }} />

        <div style={{ padding: '4px 28px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 30,
              color: 'var(--tomato-deep)', letterSpacing: '-0.01em',
            }}>myrecipes</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)',
              marginTop: 4, letterSpacing: '0.02em',
            }}>recipe no. 001 — sign in</div>
          </div>

          {/* mode toggle */}
          <div style={{
            display: 'flex', background: 'var(--parchment-dim)', borderRadius: 10,
            padding: 3, marginBottom: 20, gap: 2,
          }}>
            {[['password', 'Password'], ['magic', 'Magic link']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => { setMode(id); setStatus(null) }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
                  background: mode === id ? '#fffdf9' : 'transparent',
                  color: mode === id ? 'var(--tomato-deep)' : 'var(--charcoal-soft)',
                  boxShadow: mode === id ? '0 1px 3px rgba(42,36,32,0.12)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >{label}</button>
            ))}
          </div>

          <form onSubmit={mode === 'password' ? handlePasswordAuth : handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)' }}>email</span>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  padding: '11px 12px', borderRadius: 8, border: '1px solid var(--line)',
                  background: 'var(--parchment)', color: 'var(--charcoal)',
                  fontFamily: 'var(--font-body)', fontSize: 15,
                }}
              />
            </label>

            {mode === 'password' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)' }}>password</span>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" minLength={6}
                  style={{
                    padding: '11px 12px', borderRadius: 8, border: '1px solid var(--line)',
                    background: 'var(--parchment)', color: 'var(--charcoal)',
                    fontFamily: 'var(--font-body)', fontSize: 15,
                  }}
                />
              </label>
            )}

            {status && (
              <div style={{
                fontSize: 13, fontFamily: 'var(--font-body)', lineHeight: 1.5,
                color: status.type === 'error' ? 'var(--tomato-deep)' : 'var(--sage)',
                background: status.type === 'error' ? '#fbeae6' : 'var(--sage-light)',
                borderRadius: 8, padding: '9px 12px',
              }}>{status.text}</div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                marginTop: 6, padding: '12px 0', borderRadius: 8, border: 'none', cursor: loading ? 'default' : 'pointer',
                background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)',
                fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Working…' : mode === 'password' ? (isSignUp ? 'Create account' : 'Sign in') : 'Send magic link'}
            </button>

            {mode === 'password' && (
              <button
                type="button" onClick={() => { setIsSignUp(s => !s); setStatus(null) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', marginTop: 2,
                  color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontSize: 13,
                  textAlign: 'center',
                }}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
