import { useEffect, useState } from 'react'
import { ALLERGEN_LABELS } from '../../lib/recipeTags'
import { useT } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { DEMO_COOK_LOG } from '../../lib/demoData'

export default function InfoTab({ recipe, variants, activeVariant, onVariantChange, isGuest = false }) {
  const { t } = useT()
  const [record, setRecord] = useState(null)
  const [isLogged, setIsLogged] = useState(() => isGuest && DEMO_COOK_LOG.some(entry => entry.recipe_id === recipe.id))
  const allergens = recipe.allergen_tags || []

  useEffect(() => {
    if (isGuest) return
    let cancelled = false
    supabase.from('cook_log').select('id').eq('recipe_id', recipe.id).limit(1).then(({ data }) => {
      if (!cancelled) setIsLogged((data || []).length > 0)
    })
    return () => { cancelled = true }
  }, [recipe.id, isGuest])

  return (
    <div>
      {recipe.photo_url ? (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <img src={recipe.photo_url} alt="" style={{ display: 'block', width: '100%', height: 185, borderRadius: 12, objectFit: 'cover' }} />
          {isLogged && <span style={loggedStampStyle}>LOGGED</span>}
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
          <Fact value={recipe.calories || '—'} label="kcal" />
        </div>
        <strong style={detailsTitleStyle}>Recipe details</strong>
        <p style={detailsCopyStyle}>Allergens flag possible reactions; always verify them yourself. Variants are complete alternative versions.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <RecordButton onClick={() => setRecord('allergens')} icon={<AllergenIcon />}>{allergens.length} allergen(s) &gt;</RecordButton>
          <RecordButton onClick={() => setRecord('variants')} icon={<VariantIcon />}>{variants.length} variant(s) &gt;</RecordButton>
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

function AllergenIcon() {
  return <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 15c2-5 6-5 8 0M9 9h.01M15 9h.01"/></svg>
}

function VariantIcon() {
  return <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v5c0 2 2 3 5 3s5 1 5 3v5"/><path d="m14 17 3 3 3-3M17 4v4"/></svg>
}

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
const detailsTitleStyle = { display: 'block', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5, fontWeight: 800 }
const detailsCopyStyle = { margin: '2px 0 0', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.45 }
const recordButtonStyle = { height: 54, minWidth: 0, padding: '6px 8px', border: 0, borderRadius: 9, background: 'var(--parchment-dim)', color: 'var(--tomato-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, whiteSpace: 'nowrap' }
const sheetOverlayStyle = { position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', padding: 14, background: 'rgba(48,30,31,.38)', backdropFilter: 'blur(2px)' }
const sheetStyle = { width: '100%', maxHeight: '72dvh', overflowY: 'auto', padding: 18, borderRadius: '17px 17px 11px 11px', background: 'var(--card)', boxShadow: '0 15px 40px rgba(50,25,26,.3)' }
const closeStyle = { width: 30, height: 30, border: 0, background: 'transparent', color: 'var(--tomato-deep)', fontSize: 24, cursor: 'pointer' }
const sheetCopyStyle = { margin: '0 0 12px', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5 }
const recordRowStyle = { padding: '9px 10px', borderRadius: 8, background: 'var(--parchment-dim)', color: 'var(--charcoal)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }
const versionButtonStyle = { width: '100%', padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 9, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }
const loggedStampStyle = { position: 'absolute', right: 12, bottom: 10, width: 58, height: 58, display: 'grid', placeItems: 'center', border: '3px double var(--tomato-deep)', borderRadius: '50%', background: 'rgba(255,253,249,.88)', color: 'var(--tomato-deep)', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, transform: 'rotate(-8deg)', boxShadow: '0 2px 5px rgba(42,36,32,.16)' }
