import { useState } from 'react'
import { parseIngredientBlock } from '../../lib/ingredientParser'
import { parseStepBlock } from '../../lib/stepParser'
import { titleStyle, labelStyle, labelTextStyle, inputStyle } from '../../lib/formStyles'
import { useT } from '../../lib/i18n'

export default function VariantStep({
  variantLabel, setVariantLabel,
  groups, setGroups, paste, setPaste,
  stepGroups, setStepGroups, stepPaste, setStepPaste,
  savedVariants = [], onAddVariant, onRemoveVariant,
  photoPreview, onPhotoChange, onPhotoUrlPaste,
}) {
  const [photoUrlDraft, setPhotoUrlDraft] = useState('')
  const [photoUrlError, setPhotoUrlError] = useState(false)

  const submitPhotoUrl = () => {
    const url = photoUrlDraft.trim()
    if (!url) return
    if (!/^https?:\/\/.+/i.test(url)) { setPhotoUrlError(true); return }
    setPhotoUrlError(false)
    onPhotoUrlPaste(url)
    setPhotoUrlDraft('')
  }
  const handleParseIngredients = () => {
    const parsed = parseIngredientBlock(paste)
    if (parsed.length === 0) return
    setGroups(prev => {
      const next = [...prev]
      next[0] = { ...next[0], items: [...next[0].items, ...parsed] }
      return next
    })
    setPaste('')
  }

  const handleParseSteps = () => {
    const parsed = parseStepBlock(stepPaste)
    if (parsed.length === 0) return
    setStepGroups(prev => {
      const next = [...prev]
      next[0] = { ...next[0], items: [...next[0].items, ...parsed] }
      return next
    })
    setStepPaste('')
  }

  const { t } = useT()
  const totalIngredients = groups.reduce((s, g) => s + g.items.length, 0)
  const totalSteps = stepGroups.reduce((s, g) => s + g.items.length, 0)
  const canAdd = variantLabel.trim().length > 0 && (totalIngredients > 0 || totalSteps > 0)

  return (
    <div>
      <h2 style={titleStyle}>{t('variantStep.heading')}</h2>
      <p style={{ color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
        {t('variantStep.description')}
      </p>

      {/* List of already-saved variants */}
      {savedVariants.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {savedVariants.map(v => (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
            }}>
              {v.photo_url && (
                <img src={v.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--charcoal)' }}>{v.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 2 }}>
                  {t('variantStep.ingredientCount')((v.ingredients || []).reduce((s, g) => s + g.items.length, 0))} · {t('variantStep.stepCount')((v.steps || []).reduce((s, g) => s + g.items.length, 0))}
                </div>
              </div>
              <button
                onClick={() => onRemoveVariant?.(v.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato)', fontSize: 18, padding: '0 4px' }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Form to add a new variant */}
      <div style={{ background: 'var(--parchment-dim)', borderRadius: 12, padding: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          <span style={labelTextStyle}>{t('variantStep.variantNameLabel')}</span>
          <input
            type="text" value={variantLabel} onChange={e => setVariantLabel(e.target.value)}
            placeholder={t('variantStep.variantNamePlaceholder')}
            style={inputStyle}
          />
        </label>

        <div style={{ marginBottom: 14 }}>
          <span style={labelTextStyle}>{t('variantStep.ingredientsLabel')}</span>
          <textarea
            value={paste} onChange={e => setPaste(e.target.value)}
            placeholder={t('variantStep.ingredientsPaste')}
            rows={3}
            style={{ ...inputStyle, width: '100%', marginTop: 6, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          />
          <button onClick={handleParseIngredients} disabled={!paste.trim()} style={smallBtnStyle(paste.trim())}>{t('variantStep.parseBtn')}</button>
          {totalIngredients > 0 && (
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
              {t('variantStep.ingredientCount')(totalIngredients)}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <span style={labelTextStyle}>{t('variantStep.stepsLabel')}</span>
          <textarea
            value={stepPaste} onChange={e => setStepPaste(e.target.value)}
            placeholder={t('variantStep.stepsPaste')}
            rows={3}
            style={{ ...inputStyle, width: '100%', marginTop: 6, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          />
          <button onClick={handleParseSteps} disabled={!stepPaste.trim()} style={smallBtnStyle(stepPaste.trim())}>{t('variantStep.parseBtn')}</button>
          {totalSteps > 0 && (
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
              {t('variantStep.stepCount')(totalSteps)}
            </div>
          )}
        </div>

        <label style={{ ...labelStyle, marginBottom: 14 }}>
          <span style={labelTextStyle}>{t('variantStep.photoLabel')}</span>
          {photoPreview ? (
            <div style={{ position: 'relative', marginTop: 4 }}>
              <img src={photoPreview} alt="" style={{ width: '100%', borderRadius: 10, display: 'block', maxHeight: 140, objectFit: 'cover' }} />
              <button
                onClick={() => onPhotoChange(null)}
                style={{
                  position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 99,
                  background: 'rgba(42,36,32,0.7)', color: 'var(--card)', border: 'none', cursor: 'pointer', fontSize: 15,
                }}
              >×</button>
            </div>
          ) : (
            <>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: 70,
                borderRadius: 10, border: '2px dashed var(--line)', cursor: 'pointer', marginTop: 4,
                color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12,
              }}>
                {t('extrasStep.tapToAddPhoto')}
                <input type="file" accept="image/*" onChange={e => onPhotoChange(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              </label>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  type="url" inputMode="url"
                  value={photoUrlDraft}
                  onChange={e => { setPhotoUrlDraft(e.target.value); setPhotoUrlError(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitPhotoUrl() } }}
                  placeholder={t('extrasStep.pastePhotoUrlPlaceholder')}
                  style={{ ...inputStyle, flex: 1, padding: '9px 11px', fontSize: 14, borderColor: photoUrlError ? 'var(--tomato)' : 'var(--line)' }}
                />
                <button
                  type="button" onClick={submitPhotoUrl} disabled={!photoUrlDraft.trim()}
                  style={{
                    padding: '0 14px', borderRadius: 9, border: '1px solid var(--tomato)',
                    background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
                    fontWeight: 700, fontSize: 14, cursor: photoUrlDraft.trim() ? 'pointer' : 'default',
                    opacity: photoUrlDraft.trim() ? 1 : 0.5,
                  }}
                >{t('extrasStep.usePhotoUrl')}</button>
              </div>
              {photoUrlError && (
                <div style={{ marginTop: 4, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--tomato-deep)' }}>
                  {t('extrasStep.photoUrlError')}
                </div>
              )}
            </>
          )}
        </label>

        <button
          onClick={onAddVariant} disabled={!canAdd}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 9, border: 'none',
            background: canAdd ? 'var(--sage)' : 'var(--line)', color: 'var(--card)',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
            cursor: canAdd ? 'pointer' : 'default',
          }}
        >{t('variantStep.addVariantBtn')}</button>
      </div>
    </div>
  )
}

const smallBtnStyle = (active) => ({
  marginTop: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--tomato)',
  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
  fontWeight: 600, fontSize: 13, cursor: active ? 'pointer' : 'default', opacity: active ? 1 : 0.5,
})
