import { parseIngredientBlock } from '../../lib/ingredientParser'
import { parseStepBlock } from '../../lib/stepParser'
import { titleStyle, labelTextStyle, inputStyle } from './TitleStep'

export default function VariantStep({
  wantsVariant, setWantsVariant, variantLabel, setVariantLabel,
  groups, setGroups, paste, setPaste,
  stepGroups, setStepGroups, stepPaste, setStepPaste,
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

  if (wantsVariant === null) {
    return (
      <div>
        <h2 style={titleStyle}>Got another version of this recipe?</h2>
        <p style={{ color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
          Like a different topping combo or a meal-prep version — saved as a tab on the same recipe.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setWantsVariant(true)} style={choiceBtnStyle(false)}>Yes, add one</button>
          <button onClick={() => setWantsVariant(false)} style={choiceBtnStyle(true)}>No, just this one</button>
        </div>
      </div>
    )
  }

  if (wantsVariant === false) {
    return (
      <div>
        <h2 style={titleStyle}>All set!</h2>
        <p style={{ color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          Tap "Save recipe" below to finish.
        </p>
        <button
          onClick={() => setWantsVariant(null)}
          style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
        >← actually, add a variant</button>
      </div>
    )
  }

  // wantsVariant === true
  const totalIngredients = groups.reduce((s, g) => s + g.items.length, 0)
  const totalSteps = stepGroups.reduce((s, g) => s + g.items.length, 0)

  return (
    <div>
      <h2 style={titleStyle}>The other version</h2>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
        <span style={labelTextStyle}>variant name</span>
        <input
          type="text" value={variantLabel} onChange={e => setVariantLabel(e.target.value)}
          placeholder="e.g. Met spek"
          style={inputStyle}
        />
      </label>

      <div style={{ marginBottom: 18 }}>
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

      <div>
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
    </div>
  )
}

const choiceBtnStyle = (muted) => ({
  flex: 1, padding: '13px 0', borderRadius: 10, cursor: 'pointer',
  border: muted ? '1px solid var(--line)' : 'none',
  background: muted ? '#fffdf9' : 'var(--tomato)',
  color: muted ? 'var(--charcoal-soft)' : '#fffdf9',
  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
})

const smallBtnStyle = (active) => ({
  marginTop: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--tomato)',
  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
  fontWeight: 600, fontSize: 13, cursor: active ? 'pointer' : 'default', opacity: active ? 1 : 0.5,
})
