import { parseIngredientBlock } from '../../lib/ingredientParser'
import { parseStepBlock } from '../../lib/stepParser'
import { titleStyle, labelTextStyle, inputStyle } from './TitleStep'

export default function VariantStep({
  wantsVariant, setWantsVariant, variantLabel, setVariantLabel,
  groups, setGroups, paste, setPaste,
  stepGroups, setStepGroups, stepPaste, setStepPaste,
  savedVariants = [], onAddVariant, onRemoveVariant,
}) {
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

  const totalIngredients = groups.reduce((s, g) => s + g.items.length, 0)
  const totalSteps = stepGroups.reduce((s, g) => s + g.items.length, 0)
  const canAdd = variantLabel.trim().length > 0 && (totalIngredients > 0 || totalSteps > 0)

  return (
    <div>
      <h2 style={titleStyle}>Other versions of this recipe</h2>
      <p style={{ color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
        Optional — like a different topping combo or a meal-prep version. Saved as tabs on this recipe.
      </p>

      {/* List of already-saved variants */}
      {savedVariants.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {savedVariants.map(v => (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--charcoal)' }}>{v.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 2 }}>
                  {(v.ingredients || []).reduce((s, g) => s + g.items.length, 0)} ingredients · {(v.steps || []).reduce((s, g) => s + g.items.length, 0)} steps
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
          <span style={labelTextStyle}>variant name</span>
          <input
            type="text" value={variantLabel} onChange={e => setVariantLabel(e.target.value)}
            placeholder="e.g. Met spek"
            style={inputStyle}
          />
        </label>

        <div style={{ marginBottom: 14 }}>
          <span style={labelTextStyle}>ingredients for this variant</span>
          <textarea
            value={paste} onChange={e => setPaste(e.target.value)}
            placeholder={'paste ingredients, one per line'}
            rows={3}
            style={{ ...inputStyle, width: '100%', marginTop: 6, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          />
          <button onClick={handleParseIngredients} disabled={!paste.trim()} style={smallBtnStyle(paste.trim())}>Parse & add</button>
          {totalIngredients > 0 && (
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
              {totalIngredients} ingredient{totalIngredients !== 1 ? 's' : ''} added
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <span style={labelTextStyle}>steps for this variant</span>
          <textarea
            value={stepPaste} onChange={e => setStepPaste(e.target.value)}
            placeholder={'paste steps, one per line'}
            rows={3}
            style={{ ...inputStyle, width: '100%', marginTop: 6, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          />
          <button onClick={handleParseSteps} disabled={!stepPaste.trim()} style={smallBtnStyle(stepPaste.trim())}>Parse & add</button>
          {totalSteps > 0 && (
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
              {totalSteps} step{totalSteps !== 1 ? 's' : ''} added
            </div>
          )}
        </div>

        <button
          onClick={onAddVariant} disabled={!canAdd}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 9, border: 'none',
            background: canAdd ? 'var(--sage)' : 'var(--line)', color: '#fffdf9',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
            cursor: canAdd ? 'pointer' : 'default',
          }}
        >+ Add this variant</button>
      </div>
    </div>
  )
}

const smallBtnStyle = (active) => ({
  marginTop: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--tomato)',
  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
  fontWeight: 600, fontSize: 13, cursor: active ? 'pointer' : 'default', opacity: active ? 1 : 0.5,
})
