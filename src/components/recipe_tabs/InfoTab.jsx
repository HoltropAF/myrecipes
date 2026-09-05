import { useEffect, useState } from 'react'
import { ALLERGEN_LABELS } from '../../lib/recipeTags'
import { useT } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { DEMO_COOK_LOG } from '../../lib/demoData'
import { useBackLayer } from '../../lib/useBackLayer'

export default function InfoTab({ recipe, variants, activeVariant, onVariantChange, isGuest = false }) {
  const { t } = useT()
  const [record, setRecord] = useState(null)
  const [logCount, setLogCount] = useState(() => isGuest ? DEMO_COOK_LOG.filter(entry => entry.recipe_id === recipe.id).length : 0)
  const isLogged = logCount > 0
  const allergens = recipe.allergen_tags || []
  useBackLayer(!!record, () => setRecord(null), 'recipe-record')

  useEffect(() => {
    if (isGuest) return
    let cancelled = false
    supabase.from('cook_log').select('*', { count: 'exact', head: true }).eq('recipe_id', recipe.id).then(({ count }) => {
      if (!cancelled) setLogCount(count || 0)
    })
    return () => { cancelled = true }
  }, [recipe.id, isGuest])

  return (
    <div>
      {recipe.photo_url ? (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <img src={recipe.photo_url} alt="" style={{ display: 'block', width: '100%', height: 185, borderRadius: 12, objectFit: 'cover' }} />
          {isLogged && <LoggedStamp />}
        </div>
      ) : (
        <div style={{ width: '100%', height: 140, borderRadius: 12, marginBottom: 16, background: 'var(--parchment-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'var(--charcoal-soft)' }}>🍽</div>
      )}

      <section style={summaryCardStyle}>
        <h2 style={summaryTitleStyle}>{recipe.title}</h2>
        <p style={summaryDescriptionStyle}>{recipe.tagline || 'A saved recipe from your cookbook.'}</p>
        <div style={factsStyle}>
          <Fact value={recipe.total_minutes || '—'} label="min total" />
          <Fact value={recipe.servings || '—'} label="servings" />
          <Fact value={logCount} label={logCount === 1 ? 'time logged' : 'times logged'} />
        </div>
        <strong style={detailsTitleStyle}>Recipe details</strong>
        <p style={detailsCopyStyle}>Allergens flag possible reactions; always verify them yourself. Variants are complete alternative versions.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <RecordButton onClick={() => setRecord('allergens')} icon={<AllergenCluster />}>{allergens.length} allergen(s) &gt;</RecordButton>
          <RecordButton onClick={() => setRecord('variants')} icon={<VariantCluster />}>{variants.length} variant(s) &gt;</RecordButton>
        </div>
      </section>

      {record && (
        <RecordSheet title={record === 'allergens' ? 'Allergen record' : 'Recipe variants'} onClose={() => setRecord(null)}>
          {record === 'allergens' ? (
            <>
              <p style={sheetCopyStyle}>Automatically detected information can contain mistakes. Always check every ingredient yourself, especially for serious allergies.</p>
              {allergens.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  {allergens.map(tag => <div key={tag} style={recordRowStyle}>{t(`allergens.${tag}`, ALLERGEN_LABELS[tag] || tag)}</div>)}
                </div>
              ) : <p style={sheetCopyStyle}>No allergens are currently recorded.</p>}
            </>
          ) : (
            <>
              <p style={sheetCopyStyle}>Complete alternative versions with their own ingredients and steps.</p>
              <div style={{ display: 'grid', gap: 8 }}>
                <VersionButton active={activeVariant === 'main'} onClick={() => { onVariantChange('main'); setRecord(null) }}>Original recipe</VersionButton>
                {variants.map(v => <VersionButton key={v.id} active={activeVariant === v.id} onClick={() => { onVariantChange(v.id); setRecord(null) }}>{v.label}</VersionButton>)}
                {variants.length === 0 && <p style={sheetCopyStyle}>No recipe variants are currently recorded.</p>}
              </div>
            </>
          )}
        </RecordSheet>
      )}
    </div>
  )
}

function RecordButton({ icon, onClick, children }) {
  return <button onClick={onClick} style={recordButtonStyle}>{icon}<b>{children}</b></button>
}

function LoggedStamp() {
  return <span aria-label="Logged" style={stampStyle}>
    <i style={{ ...stampStarsStyle, top: 9 }}>★ ★ ★</i>
    <b style={stampBannerStyle}>LOGGED</b>
    <i style={{ ...stampStarsStyle, bottom: 8 }}>★ ★ ★</i>
  </span>
}

function AllergenCluster() {
  return <span style={clusterStyle} aria-hidden="true">
    <span style={{ ...sealStyle, left: 0, top: 7 }}><WheatIcon /></span>
    <span style={{ ...sealStyle, left: 13, top: 0 }}><MilkIcon /></span>
    <span style={{ ...sealStyle, left: 25, top: 9 }}><NutIcon /></span>
  </span>
}

function VariantCluster() { return <span style={{ ...clusterStyle, width: 49, height: 37 }} aria-hidden="true"><span style={{ ...sealStyle, width: 26, height: 26, left: 1, top: 7 }}><ForkIcon /></span><span style={{ ...sealStyle, width: 26, height: 26, left: 21, top: 1, background: 'var(--parchment-dim)' }}><LeafIcon /></span></span> }
const Icon = ({ children }) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
function WheatIcon() { return <Icon><path d="M12 21V4M12 8c-3 0-5-2-5-4 3 0 5 2 5 4Zm0 5c-3 0-5-2-5-4 3 0 5 2 5 4Zm0 5c-3 0-5-2-5-4 3 0 5 2 5 4Zm0-10c3 0 5-2 5-4-3 0-5 2-5 4Zm0 5c3 0 5-2 5-4-3 0-5 2-5 4Z"/></Icon> }
function MilkIcon() { return <Icon><path d="M9 3h6l1 4v13H8V7l1-4Zm-1 7h8"/></Icon> }
function NutIcon() { return <Icon><path d="M8 4c4 0 5 3 5 6s-2 8-6 9c-3 1-5-2-4-5 1-4 1-10 5-10Zm5 6c2-3 6-3 8 0 2 4-1 9-6 9-2 0-4-1-5-3"/></Icon> }
function ForkIcon() { return <Icon><path d="M7 4v5c0 2 2 3 5 3s5 1 5 3v5"/><path d="m14 17 3 3 3-3M17 4v4"/></Icon> }
function LeafIcon() { return <Icon><path d="M5 18C5 9 11 5 20 5c0 9-5 14-13 14"/><path d="M7 17c3-3 6-5 10-7"/></Icon> }

function RecordSheet({ title, onClose, children }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={sheetOverlayStyle}>
      <section style={sheetStyle}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, color: 'var(--tomato-deep)', fontFamily: 'var(--font-display)', fontSize: 20 }}>{title}</h2>
          <button aria-label="Close record" onClick={onClose} style={closeStyle}>×</button>
        </header>
        {children}
      </section>
    </div>
  )
}

function VersionButton({ active, onClick, children }) {
  return <button onClick={onClick} style={{ ...versionButtonStyle, background: active ? 'var(--tomato)' : 'var(--parchment-dim)', color: active ? '#fffdf9' : 'var(--charcoal)' }}>{children}</button>
}

function Fact({ value, label }) {
  return <div style={factStyle}><b style={{ color: 'var(--tomato-deep)', fontFamily: 'var(--font-display)', fontSize: 17 }}>{value}</b><small style={{ color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 8, textTransform: 'uppercase' }}>{label}</small></div>
}

const summaryCardStyle = { padding: 14, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--card)', boxShadow: '0 4px 14px rgba(70,35,35,.06)' }
const summaryTitleStyle = { margin: 0, color: 'var(--tomato-deep)', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }
const summaryDescriptionStyle = { margin: '5px 0 0', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.45 }
const factsStyle = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginTop: 12 }
const factStyle = { minHeight: 48, padding: '8px 5px', borderRadius: 9, background: 'var(--parchment-dim)', display: 'grid', placeItems: 'center', alignContent: 'center' }
const detailsTitleStyle = { display: 'block', marginTop: 22, color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5, fontWeight: 800 }
const detailsCopyStyle = { margin: '2px 0 0', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.45 }
const recordButtonStyle = { height: 54, minWidth: 0, padding: '6px 8px', border: 0, borderRadius: 9, background: 'var(--parchment-dim)', color: 'var(--tomato-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, whiteSpace: 'nowrap' }
const sheetOverlayStyle = { position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', padding: 14, background: 'rgba(48,30,31,.38)', backdropFilter: 'blur(2px)' }
const sheetStyle = { width: '100%', maxHeight: '72dvh', overflowY: 'auto', padding: 18, borderRadius: '17px 17px 11px 11px', background: 'var(--card)', boxShadow: '0 15px 40px rgba(50,25,26,.3)' }
const closeStyle = { width: 30, height: 30, border: 0, background: 'transparent', color: 'var(--tomato-deep)', fontSize: 24, cursor: 'pointer' }
const sheetCopyStyle = { margin: '0 0 12px', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5 }
const recordRowStyle = { padding: '9px 10px', borderRadius: 8, background: 'var(--parchment-dim)', color: 'var(--charcoal)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }
const versionButtonStyle = { width: '100%', padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 9, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }
const stampStyle = { position: 'absolute', zIndex: 2, right: 22, bottom: -18, width: 62, height: 62, display: 'grid', placeItems: 'center', border: '3px solid var(--tomato-deep)', borderRadius: '50%', background: 'rgba(255,253,249,.86)', boxShadow: 'inset 0 0 0 2px #fffaf3, inset 0 0 0 4px var(--tomato-deep), 0 4px 12px rgba(64,27,31,.18)', color: 'var(--tomato-deep)', transform: 'rotate(-11deg)', opacity: .9 }
const stampStarsStyle = { position: 'absolute', left: 12, right: 12, display: 'flex', justifyContent: 'space-around', fontFamily: 'Georgia, serif', fontSize: 7, lineHeight: 1, fontWeight: 700 }
const stampBannerStyle = { position: 'absolute', zIndex: 3, left: -7, right: -7, top: 20, height: 20, display: 'grid', placeItems: 'center', borderTop: '2px solid var(--tomato-deep)', borderBottom: '2px solid var(--tomato-deep)', background: '#fffaf3', boxShadow: '0 -2px 0 #fffaf3, 0 2px 0 #fffaf3', fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1, fontWeight: 900, letterSpacing: '.035em', maskImage: 'linear-gradient(90deg, transparent 0, #000 16%, #000 84%, transparent 100%)' }
const clusterStyle = { position: 'relative', display: 'block', width: 48, height: 36, flex: '0 0 auto', transform: 'scale(.72)', transformOrigin: 'center' }
const sealStyle = { position: 'absolute', width: 23, height: 23, display: 'grid', placeItems: 'center', padding: 3, boxSizing: 'border-box', border: '1px solid var(--tomato-deep)', borderRadius: '50%', background: 'var(--card)' }
