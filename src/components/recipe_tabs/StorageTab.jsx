import { useT } from '../../lib/i18n'

export default function StorageTab({ recipe }) {
  const { t } = useT()
  // Must match the render guard below, which treats undefined as "no value" too.
  // Checking only against null made this true for every recipe that has never
  // had the freezer flag set, so the tab rendered completely empty.
  const hasFreezerInfo = recipe.freezer_friendly !== null && recipe.freezer_friendly !== undefined
  const hasContent = hasFreezerInfo || recipe.notes || recipe.source

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {recipe.freezer_friendly !== null && recipe.freezer_friendly !== undefined && (
        <section style={cardStyle}>
          <SectionLabel>{t('storageTab.freezerLabel')}</SectionLabel>
          <div style={{
            background: recipe.freezer_friendly ? 'var(--sage-light)' : 'var(--parchment-dim)',
            borderRadius: 9, padding: '11px 13px',
            fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)',
          }}>
            {recipe.freezer_friendly ? t('storageTab.freezesWell') : t('storageTab.notFreezer')}
          </div>
        </section>
      )}

      {recipe.notes && (
        <section style={cardStyle}>
          <SectionLabel>{t('storageTab.notesLabel')}</SectionLabel>
          <div style={{
            background: 'var(--sage-light)', borderRadius: 10, padding: '12px 14px',
            fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.5,
          }}>{recipe.notes}</div>
        </section>
      )}

      {recipe.source && (
        <section style={cardStyle}>
          <SectionLabel>{t('storageTab.sourceLabel')}</SectionLabel>
          <a href={recipe.source} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--tomato-deep)' }}>
            {recipe.source} ↗
          </a>
        </section>
      )}

      {!hasContent && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)', textAlign: 'center', padding: '30px 0' }}>
          {t('storageTab.noInfo')}
        </div>
      )}
    </div>
  )
}

const cardStyle = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: 13 }

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
    }}>{children}</div>
  )
}
