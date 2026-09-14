import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'

// Two ways to combine recipes, picked at the top of this sheet:
//  - merge: destructive but simple. One recipe survives, the rest become its
//    variants ({id, label, ingredients, steps, photo_url}, same shape the
//    wizard's own variant step produces) and are deleted as standalone rows.
//  - link: reversible. Every recipe stays exactly as it is; they're just
//    tagged with a shared recipe_groups row so the list can optionally
//    collapse them into one card. Unlinking just clears group_id again.
export default function MergeRecipesSheet({ recipes, onClose, onMerged }) {
  const { t } = useT()
  const [mode, setMode] = useState('link')
  const [baseId, setBaseId] = useState(recipes[0]?.id)
  const [combinedName, setCombinedName] = useState(recipes[0]?.title || '')
  const [labels, setLabels] = useState(() => Object.fromEntries(recipes.map(r => [r.id, r.title])))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const base = recipes.find(r => r.id === baseId)
  const others = recipes.filter(r => r.id !== baseId)
  const canConfirm = combinedName.trim().length > 0 && !saving

  const handleMerge = async () => {
    if (!base) return
    const newVariants = others.map((r, i) => ({
      id: `var_${Date.now()}_${i}`,
      label: (labels[r.id] || r.title).trim() || r.title,
      ingredients: r.ingredients || [],
      steps: r.steps || [],
      photo_url: r.photo_url || null,
    }))

    const { error: updateError } = await supabase.from('recipes')
      .update({ title: combinedName.trim(), variants: [...(base.variants || []), ...newVariants] })
      .eq('id', base.id)
    if (updateError) throw updateError

    for (const r of others) {
      await supabase.from('cook_log').update({ recipe_id: base.id }).eq('recipe_id', r.id)
      const { error: deleteError } = await supabase.from('recipes').delete().eq('id', r.id)
      if (deleteError) throw deleteError
    }
  }

  const handleLink = async () => {
    const { data: group, error: groupError } = await supabase.from('recipe_groups')
      .insert({ name: combinedName.trim() })
      .select('id')
      .single()
    if (groupError) throw groupError
    const { error: linkError } = await supabase.from('recipes')
      .update({ group_id: group.id })
      .in('id', recipes.map(r => r.id))
    if (linkError) throw linkError
  }

  const handleConfirm = async () => {
    if (!canConfirm) return
    setSaving(true)
    setError('')
    try {
      if (mode === 'merge') await handleMerge()
      else await handleLink()
      await onMerged?.()
    } catch (err) {
      setError(err.message || t('mergeRecipes.error'))
      setSaving(false)
    }
  }

  return (
    <div onMouseDown={e => e.target === e.currentTarget && onClose()} style={backdropStyle}>
      <section style={sheetStyle} role="dialog" aria-modal="true" aria-labelledby="merge-recipes-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h2 id="merge-recipes-title" style={{ margin: 0, flex: 1, fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--tomato-deep)' }}>
            {t('mergeRecipes.title')}
          </h2>
          <button onClick={onClose} aria-label={t('mergeRecipes.close')} style={closeButtonStyle}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <ModeButton active={mode === 'merge'} onClick={() => setMode('merge')}>{t('mergeRecipes.modeMerge')}</ModeButton>
          <ModeButton active={mode === 'link'} onClick={() => setMode('link')}>{t('mergeRecipes.modeLink')}</ModeButton>
        </div>
        <p style={hintStyle}>{mode === 'merge' ? t('mergeRecipes.description') : t('mergeRecipes.linkDescription')}</p>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
          <span style={labelTextStyle}>{mode === 'merge' ? t('mergeRecipes.nameLabel') : t('mergeRecipes.groupNameLabel')}</span>
          <input
            type="text" value={combinedName} onChange={e => setCombinedName(e.target.value)}
            placeholder={t('mergeRecipes.namePlaceholder')}
            style={inputStyle}
          />
        </label>

        {mode === 'merge' ? (
          <>
            <div style={{ ...labelTextStyle, marginBottom: 8 }}>{t('mergeRecipes.pickBase')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              {recipes.map(r => {
                const isBase = r.id === baseId
                return (
                  <div key={r.id} style={{ ...rowStyle, borderColor: isBase ? 'var(--tomato)' : 'var(--line)' }}>
                    <button type="button" onClick={() => setBaseId(r.id)} style={radioStyle(isBase)} aria-label={t('mergeRecipes.useAsBase')}>
                      {isBase && <span style={radioDotStyle} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </div>
                      {isBase ? (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--sage)', marginTop: 2 }}>{t('mergeRecipes.becomesMain')}</div>
                      ) : (
                        <input
                          type="text" value={labels[r.id] ?? r.title}
                          onChange={e => setLabels(prev => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder={t('mergeRecipes.variantLabelPlaceholder')}
                          style={{ ...inputStyle, marginTop: 5, padding: '6px 9px', fontSize: 13 }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {recipes.map(r => (
              <div key={r.id} style={rowStyle}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div role="alert" style={{ fontSize: 12.5, color: 'var(--tomato-deep)', margin: '4px 0 10px' }}>{error}</div>}

        <button onClick={handleConfirm} disabled={!canConfirm} style={{ ...confirmButtonStyle, opacity: canConfirm ? 1 : 0.5, cursor: canConfirm ? 'pointer' : 'default' }}>
          {saving
            ? t('mergeRecipes.merging')
            : mode === 'merge' ? t('mergeRecipes.confirmBtn')(recipes.length) : t('mergeRecipes.confirmLinkBtn')(recipes.length)}
        </button>
      </section>
    </div>
  )
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
        background: active ? 'var(--tomato)' : 'var(--card)',
        color: active ? '#fffdf9' : 'var(--charcoal)',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
      }}
    >{children}</button>
  )
}

const backdropStyle = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(38, 25, 22, 0.38)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }
const sheetStyle = { width: '100%', maxWidth: 480, maxHeight: '85dvh', overflowY: 'auto', boxSizing: 'border-box', background: 'var(--card)', borderRadius: '22px 22px 0 0', padding: '18px 20px calc(20px + env(safe-area-inset-bottom))', boxShadow: '0 -12px 40px rgba(55, 23, 18, 0.18)' }
const closeButtonStyle = { width: 32, height: 32, border: 0, background: 'none', color: 'var(--charcoal-soft)', fontSize: 22, cursor: 'pointer', flexShrink: 0 }
const hintStyle = { margin: '0 0 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal-soft)', lineHeight: 1.5 }
const labelTextStyle = { fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)' }
const inputStyle = { padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--parchment)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 15, width: '100%', boxSizing: 'border-box' }
const rowStyle = { display: 'flex', gap: 10, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--parchment-dim)' }
const radioStyle = (active) => ({
  width: 20, height: 20, borderRadius: 99, flexShrink: 0, marginTop: 2, cursor: 'pointer',
  border: `1.5px solid ${active ? 'var(--tomato)' : 'var(--line)'}`, background: 'var(--card)',
  display: 'grid', placeItems: 'center',
})
const radioDotStyle = { width: 10, height: 10, borderRadius: 99, background: 'var(--tomato)' }
const confirmButtonStyle = { width: '100%', minHeight: 46, marginTop: 6, border: 0, borderRadius: 10, background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15 }
