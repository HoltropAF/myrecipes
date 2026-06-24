import { ALLERGEN_LABELS, DIET_TAGS } from '../../lib/recipeTags'
import { useT } from '../../lib/i18n'

export default function InfoTab({ recipe, variants, activeVariant, onVariantChange }) {
  const { t } = useT()

  return (
    <div>
      {recipe.photo_url ? (
        <img src={recipe.photo_url} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 240, objectFit: 'cover', marginBottom: 16 }} />
      ) : (
        <div style={{
          width: '100%', height: 140, borderRadius: 12, marginBottom: 16, background: 'var(--parchment-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'var(--charcoal-soft)',
        }}>🍽</div>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        {recipe.category && <MetaChip>{recipe.category}{recipe.subcategory ? ` · ${recipe.subcategory}` : ''}</MetaChip>}
        {recipe.total_minutes && <MetaChip>{recipe.total_minutes} min</MetaChip>}
        {recipe.freezer_friendly === true && <MetaChip>{t('infoTab.freezesWell')}</MetaChip>}
        {recipe.freezer_friendly === false && <MetaChip>{t('infoTab.notFreezer')}</MetaChip>}
      </div>

      {/* Allergen + diet badges — computed server-side from ingredient_tags */}
      {(recipe.allergen_tags?.length > 0 || recipe.is_vegan || recipe.is_vegetarian || recipe.is_pescatarian_or_better) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {recipe.is_vegan && <ComputedBadge diet>{t('diet.vegan')}</ComputedBadge>}
          {!recipe.is_vegan && recipe.is_vegetarian && <ComputedBadge diet>{t('diet.vegetarian')}</ComputedBadge>}
          {!recipe.is_vegan && !recipe.is_vegetarian && recipe.is_pescatarian_or_better && <ComputedBadge diet>{t('diet.pescatarian')}</ComputedBadge>}
          {(recipe.allergen_tags || []).map(tag => (
            <ComputedBadge key={tag}>{t(`allergens.${tag}`) || ALLERGEN_LABELS[tag] || tag}</ComputedBadge>
          ))}
        </div>
      )}

      {/* Version picker — pills for a few versions, dropdown once there are many */}
      {variants.length > 0 && (
        <div>
          <SectionLabel>{t('infoTab.whichVersion')}</SectionLabel>
          {variants.length > 3 ? (
            <select
              value={activeVariant}
              onChange={e => onVariantChange(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--line)',
                background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)',
                fontWeight: 600, fontSize: 15, cursor: 'pointer',
              }}
            >
              <option value="main">{t('infoTab.original')}</option>
              {variants.map(v => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <VersionPill active={activeVariant === 'main'} onClick={() => onVariantChange('main')}>
                {t('infoTab.original')}
              </VersionPill>
              {variants.map(v => (
                <VersionPill key={v.id} active={activeVariant === v.id} onClick={() => onVariantChange(v.id)}>
                  {v.label}
                </VersionPill>
              ))}
            </div>
          )}
        </div>
      )}
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

function ComputedBadge({ children, diet = false }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 12, borderRadius: 99, padding: '4px 10px',
      color: diet ? 'var(--sage)' : 'var(--charcoal-soft)',
      background: diet ? 'var(--sage-light)' : 'var(--parchment-dim)',
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
