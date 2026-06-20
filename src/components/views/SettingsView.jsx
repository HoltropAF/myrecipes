import { supabase } from '../../lib/supabase'

export default function SettingsView({ userEmail }) {
  return (
    <div style={{ padding: '0 20px 100px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }}>
        Settings
      </h1>

      <div style={{ background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 4 }}>signed in as</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--charcoal)' }}>{userEmail}</div>
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--line)',
          background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
        }}
      >Sign out</button>
    </div>
  )
}
