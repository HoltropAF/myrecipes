import NutritionSection from '../NutritionSection'

export default function InfoTab({ recipe, variants, activeVariant, onVariantChange, servings, baseServings, onServingsChange, onUpdated }) {
  return (
    <div>
      {recipe.photo_url && (
        <img src={recipe.photo_url} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 240, objectFit: 'cover', marginBottom: 16 }} />
      )}

      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, color: 'var(--tomato-deep)', lineHeight: 1.15, marginBottom: 4 }}>
        {recipe.title}
      </h1>
      {recipe.tagline && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal-soft)', marginBottom: 10 }}>{recipe.tagline}</div>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        {recipe.category && <MetaChip>{recipe.category}{recipe.subcategory ? ` · ${recipe.subcategory}` : ''}</MetaChip>}
        {recipe.total_minutes && <MetaChip>{recipe.total_minutes} min</MetaChip>}
        {recipe.freezer_friendly === true && <MetaChip>Freezes well</MetaChip>}
        {recipe.freezer_friendly === false && <MetaChip>Not freezer-friendly</MetaChip>}
      </div>

      {/* Version picker */}
      {variants.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionLabel>Which version?</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <VersionPill active={activeVariant === 'main'} onClick={() => onVariantChange('main')}>
              Origineel
            </VersionPill>
            {variants.map(v => (
              <VersionPill key={v.id} active={activeVariant === v.id} onClick={() => onVariantChange(v.id)}>
                {v.label}
              </VersionPill>
            ))}
          </div>
        </div>
      )}

      {/* Servings adjuster */}
      {baseServings && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>servings</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <StepperBtn onClick={() => onServingsChange(s => Math.max(1, (s || baseServings) - 1))}>−</StepperBtn>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, minWidth: 24, textAlign: 'center' }}>{servings || baseServings}</span>
            <StepperBtn onClick={() => onServingsChange(s => (s || baseServings) + 1)}>+</StepperBtn>
          </div>
        </div>
      )}

      {/* Nutrition */}
      <SectionLabel>Nutrition</SectionLabel>
      <div>
        <NutritionSection recipe={recipe} onUpdated={onUpdated} />
      </div>
    </div>
  )
}

function VersionPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
        border: `1.5px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
        background: active ? 'var(--tomato)' : 'var(--card)',
        color: active ? '#fffdf9' : 'var(--charcoal)',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
      }}
    >{children}</button>
  )
}

function MetaChip({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)',
      background: 'var(--parchment-dim)', borderRadius: 99, padding: '4px 10px',
    }}>{children}</span>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
    }}>{children}</div>
  )
}

function StepperBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--parchment)',
        color: 'var(--tomato-deep)', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)',
      }}
    >{children}</button>
  )
}
