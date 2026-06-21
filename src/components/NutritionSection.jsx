import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { estimateNutrition } from '../lib/nutritionEstimator'

export default function NutritionSection({ recipe, onUpdated }) {
  const [estimating, setEstimating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)

  const [calories, setCalories] = useState(recipe.calories ?? '')
  const [protein, setProtein] = useState(recipe.protein_g ?? '')
  const [carbs, setCarbs] = useState(recipe.carbs_g ?? '')
  const [fat, setFat] = useState(recipe.fat_g ?? '')

  const servings = recipe.servings || 1
  const hasData = recipe.calories !== null && recipe.calories !== undefined

  const handleEstimate = async () => {
    setEstimating(true)
    setError(null)
    try {
      const result = estimateNutrition(recipe.ingredients)
      if (!result) {
        setError('Couldn\'t recognize enough ingredients to estimate — try entering manually.')
        setEstimating(false)
        return
      }

      const { error: updateError } = await supabase.from('recipes').update({
        ...result,
        nutrition_is_estimate: true,
      }).eq('id', recipe.id)
      if (updateError) throw updateError

      setCalories(result.calories)
      setProtein(result.protein_g)
      setCarbs(result.carbs_g)
      setFat(result.fat_g)
      onUpdated?.({ ...recipe, ...result, nutrition_is_estimate: true })
    } catch (err) {
      setError('Could not save the estimate — try again or enter manually.')
    } finally {
      setEstimating(false)
    }
  }

  const handleSaveManual = async () => {
    const payload = {
      calories: calories === '' ? null : parseFloat(calories),
      protein_g: protein === '' ? null : parseFloat(protein),
      carbs_g: carbs === '' ? null : parseFloat(carbs),
      fat_g: fat === '' ? null : parseFloat(fat),
      nutrition_is_estimate: false,
    }
    const { error: updateError } = await supabase.from('recipes').update(payload).eq('id', recipe.id)
    if (!updateError) {
      setEditing(false)
      onUpdated?.({ ...recipe, ...payload })
    }
  }

  if (editing) {
    return (
      <div style={{ background: 'var(--parchment-dim)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <NutritionInput label="calories (total)" value={calories} onChange={setCalories} />
          <NutritionInput label="protein g (total)" value={protein} onChange={setProtein} />
          <NutritionInput label="carbs g (total)" value={carbs} onChange={setCarbs} />
          <NutritionInput label="fat g (total)" value={fat} onChange={setFat} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSaveManual} style={primaryBtnStyle}>Save</button>
          <button onClick={() => setEditing(false)} style={secondaryBtnStyle}>Cancel</button>
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div>
        {error && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--tomato-deep)', marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleEstimate} disabled={estimating} style={primaryBtnStyle}>
            {estimating ? 'Estimating…' : '📊 Estimate from ingredients'}
          </button>
          <button onClick={() => setEditing(true)} style={secondaryBtnStyle}>Enter manually</button>
        </div>
      </div>
    )
  }

  const perServing = (val) => val !== null && val !== undefined ? Math.round(val / servings) : null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
        <NutritionTile label="kcal" total={recipe.calories} perServing={perServing(recipe.calories)} />
        <NutritionTile label="protein" total={recipe.protein_g} perServing={perServing(recipe.protein_g)} unit="g" />
        <NutritionTile label="carbs" total={recipe.carbs_g} perServing={perServing(recipe.carbs_g)} unit="g" />
        <NutritionTile label="fat" total={recipe.fat_g} perServing={perServing(recipe.fat_g)} unit="g" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>
          {recipe.nutrition_is_estimate ? '📊 rough estimate' : 'manually entered'} · per serving shown below total
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setEditing(true)} style={linkBtnStyle}>Edit</button>
          <button onClick={handleEstimate} disabled={estimating} style={linkBtnStyle}>{estimating ? '…' : 'Re-estimate'}</button>
        </div>
      </div>
    </div>
  )
}

function NutritionTile({ label, total, perServing, unit = '' }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--tomato-deep)' }}>
        {total !== null && total !== undefined ? Math.round(total) : '—'}{unit}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-soft)', marginTop: 2 }}>{label}</div>
      {perServing !== null && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--sage)', marginTop: 2 }}>{perServing}{unit}/serv</div>
      )}
    </div>
  )
}

function NutritionInput({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)' }}>{label}</span>
      <input
        type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', fontFamily: 'var(--font-body)', fontSize: 14 }}
      />
    </label>
  )
}

const primaryBtnStyle = {
  padding: '9px 14px', borderRadius: 9, border: 'none', background: 'var(--tomato)',
  color: 'var(--card)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
const secondaryBtnStyle = {
  padding: '9px 14px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--card)',
  color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
}
const linkBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
}
