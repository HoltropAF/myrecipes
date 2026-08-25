import { useT } from '../lib/i18n'
import { useCompact } from '../lib/useCompact'

const TAB_IDS = ['recipes', 'shopping', 'home', 'mealprep', 'settings']

export default function BottomNav({ active, onChange, homeIcon = 'compass' }) {
  const { t } = useT()
  const compact = useCompact()
  const labels = { recipes: t('nav.recipes'), shopping: t('nav.shopping'), home: t('nav.home', 'Home'), mealprep: t('nav.mealprep'), settings: t('nav.settings') }
  return <div style={{ position: 'sticky', bottom: 0, display: 'flex', background: 'var(--card)', borderTop: '1px solid var(--line)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 60 }}>
    {TAB_IDS.map(id => <button key={id} onClick={() => onChange(id)} aria-label={labels[id]} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: compact ? '8px 0 6px' : '10px 0 8px', border: 'none', background: 'none', cursor: 'pointer', minWidth: 0 }}>
      <span style={id === 'home' ? { width: compact ? 52 : 58, height: compact ? 52 : 58, marginTop: compact ? -28 : -33, display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--tomato)', color: '#fffdf9', border: '4px solid var(--card)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--tomato) 38%, transparent), 0 7px 18px rgba(138,52,49,.3)' } : { opacity: active === id ? 1 : .55, color: active === id ? 'var(--tomato-deep)' : 'var(--charcoal-soft)' }}>
        {id === 'home' ? <HomeButtonIcon variant={homeIcon} size={compact ? 32 : 36} /> : <TabIcon id={id} size={compact ? 17 : 20} />}
      </span>
      {id !== 'home' && <span style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 10 : 11, color: active === id ? 'var(--tomato-deep)' : 'var(--charcoal-soft)', fontWeight: active === id ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{labels[id]}</span>}
    </button>)}
  </div>
}

function HomeButtonIcon({ variant, size }) {
  if (variant === 'cookbook') {
    return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <circle cx="16" cy="16" r="13" opacity=".82" />
      <path d="M9 9.5h6.5c1.5 0 2.5 1 2.5 2.5v11c0-1.5-1-2.5-2.5-2.5H9v-11Zm14 0h-3c-1.2 0-2 .8-2 2.2V23c0-1.5 1-2.5 2.5-2.5H23v-11Z" />
      <path d="m16 5 1.2 2.4L20 8.5l-2.8 1.1L16 12l-1.2-2.4L12 8.5l2.8-1.1L16 5Z" fill="var(--mustard)" stroke="none" />
    </svg>
  }
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.1" />
    <path d="m16 4 3.5 8.5L28 16l-8.5 3.5L16 28l-3.5-8.5L4 16l8.5-3.5L16 4Z" fill="currentColor" />
    <circle cx="16" cy="16" r="4.3" fill="var(--mustard)" />
    <path d="m16 12.8 1.2 3.2-1.2 3.2-1.2-3.2 1.2-3.2Z" fill="#fff8f1" />
  </svg>
}

function TabIcon({ id, size }) {
  const paths = {
    recipes: <path d="M7 3h10v18l-5-3-5 3V3Z"/>,
    shopping: <><path d="M5 5h3v3H5zM5 11h3v3H5zM5 17h3v3H5z"/><path d="M11 6h8M11 12h8M11 18h8"/></>,
    mealprep: <><path d="M5 4h14v17H5z"/><path d="M8 2v5M16 2v5M8 11h8M8 15h6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[id]}</svg>
}
