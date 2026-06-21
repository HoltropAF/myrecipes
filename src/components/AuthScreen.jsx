import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen({ onGuest }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null) // { type: 'error'|'info', text }
  const [loading, setLoading] = useState(false)

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) setStatus({ type: 'error', text: error.message })
    else setStatus({ type: 'info', text: `Link sent to ${email}. Check your inbox and tap it on this device.` })
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--parchment)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 360, background: 'var(--card)',
        border: '1px solid var(--line)', borderRadius: '2px 2px 10px 10px',
        boxShadow: '0 1px 0 var(--line), 0 18px 40px -20px rgba(42,36,32,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
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

          <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                background: 'var(--tomato)', color: 'var(--card)', fontFamily: 'var(--font-body)',
                fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>

            <div style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)',
              textAlign: 'center', marginTop: 2, lineHeight: 1.5,
            }}>
              Open the link on this device to stay signed in.
            </div>
          </form>

          {onGuest && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>
              <button
                onClick={onGuest}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 8, border: '1px solid var(--line)',
                  background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >Continue as guest</button>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)',
                textAlign: 'center', marginTop: 8, lineHeight: 1.5,
              }}>
                Browse a demo cookbook. Nothing you do is saved.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
