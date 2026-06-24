import { useT } from '../../lib/i18n'

export default function StorageTab({ recipe }) {
  const { t } = useT()
  const hasContent = recipe.freezer_friendly !== null || recipe.notes || recipe.source

  return (
    <div>
      {recipe.freezer_friendly !== null && recipe.freezer_friendly !== undefined && (
        <div style={{ marginBottom: 18 }}>
          <SectionLabel>{t('storageTab.freezerLabel')}</SectionLabel>
          <div style={{
            background: recipe.freezer_friendly ? 'var(--sage-light)' : 'var(--parchment-dim)',
            borderRadius: 10, padding: '12px 14px',
            fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)',
          }}>
            {recipe.freezer_friendly ? t('storageTab.freezesWell') : t('storageTab.notFreezer')}
          </div>
        </div>
      )}

      {recipe.notes && (
        <div style={{ marginBottom: 18 }}>
          <SectionLabel>{t('storageTab.notesLabel')}</SectionLabel>
          <div style={{
            background: 'var(--sage-light)', borderRadius: 10, padding: '12px 14px',
            fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.5,
          }}>{recipe.notes}</div>
        </div>
      )}

      {recipe.source && (
        <div>
          <SectionLabel>{t('storageTab.sourceLabel')}</SectionLabel>
          <a href={recipe.source} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--tomato-deep)' }}>
            {recipe.source} ↗
          </a>
        </div>
      )}

      {!hasContent && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)', textAlign: 'center', padding: '30px 0' }}>
          {t('storageTab.noInfo')}
        </div>
      )}
    </div>
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
