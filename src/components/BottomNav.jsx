import { useT } from '../lib/i18n'
import { useCompact } from '../lib/useCompact'
import { DinnerBellIcon } from './views/HomeView'

const TAB_IDS = ['recipes', 'shopping', 'home', 'mealprep', 'settings']

export default function BottomNav({ active, onChange }) {
  const { t } = useT()
  const compact = useCompact()
  const labels = { recipes: t('nav.recipes'), shopping: t('nav.shopping'), home: t('nav.home', 'Home'), mealprep: t('nav.mealprep'), settings: t('nav.settings') }
  return <div style={{ position: 'sticky', bottom: 0, display: 'flex', background: 'var(--card)', borderTop: '1px solid var(--line)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 60 }}>
    {TAB_IDS.map(id => <button key={id} onClick={() => onChange(id)} aria-label={labels[id]} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: compact ? '8px 0 6px' : '10px 0 8px', border: 'none', background: 'none', cursor: 'pointer', minWidth: 0 }}>
      <span style={id === 'home' ? { width: compact ? 38 : 44, height: compact ? 38 : 44, marginTop: compact ? -20 : -25, display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--tomato)', color: '#fffdf9', border: '4px solid var(--card)', boxShadow: '0 5px 14px rgba(193,67,47,.28)' } : { opacity: active === id ? 1 : .55, color: active === id ? 'var(--tomato-deep)' : 'var(--charcoal-soft)' }}>
        {id === 'home' ? <DinnerBellIcon size={compact ? 20 : 23} /> : <TabIcon id={id} size={compact ? 17 : 20} />}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 9 : 10, color: active === id ? 'var(--tomato-deep)' : 'var(--charcoal-soft)', fontWeight: active === id ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{labels[id]}</span>
    </button>)}
  </div>
}

function TabIcon({ id, size }) {
  const paths = {
    recipes: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z"/></>,
    shopping: <><path d="M4 7h16l-2 9H7L4 4H2"/><circle cx="8" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></>,
    mealprep: <><path d="M4 6h16v14H4z"/><path d="M8 3v6M16 3v6M4 10h16"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[id]}</svg>
}
