import { useState } from 'react'
import { supabase } from '../lib/supabase'
import TitleStep from './wizard/TitleStep'
import IngredientsStep from './wizard/IngredientsStep'
import StepsStep from './wizard/StepsStep'
import ExtrasStep from './wizard/ExtrasStep'
import VariantStep from './wizard/VariantStep'

const STEPS = ['title', 'ingredients', 'steps', 'extras', 'variant']

const emptyGroup = () => ({ group: null, items: [] })

export default function AddRecipeWizard({ onClose, onSaved, existingCategories = [], existingGroups = [] }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Form state
  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')

  const [ingredientGroups, setIngredientGroups] = useState([emptyGroup()])
  const [ingredientPaste, setIngredientPaste] = useState('')
  const [showIngredientGrouping, setShowIngredientGrouping] = useState(false)

  const [stepGroups, setStepGroups] = useState([{ group: 'Bereiding', items: [] }])
  const [stepPaste, setStepPaste] = useState('')

  const [servings, setServings] = useState('')
  const [totalMinutes, setTotalMinutes] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [wantsVariant, setWantsVariant] = useState(null) // null | true | false
  const [variantLabel, setVariantLabel] = useState('')
  const [variantIngredientGroups, setVariantIngredientGroups] = useState([emptyGroup()])
  const [variantIngredientPaste, setVariantIngredientPaste] = useState('')
  const [variantStepGroups, setVariantStepGroups] = useState([{ group: 'Bereiding', items: [] }])
  const [variantStepPaste, setVariantStepPaste] = useState('')

  const step = STEPS[stepIndex]
  const goNext = () => setStepIndex(i => Math.min(i + 1, STEPS.length - 1))
  const goBack = () => setStepIndex(i => Math.max(i - 1, 0))

  const handlePhotoChange = (file) => {
    setPhotoFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setPhotoPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setPhotoPreview(null)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData?.user?.id
      if (!user_id) throw new Error('Not signed in')

      let photo_url = null
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `${user_id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('recipe-photos').upload(path, photoFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('recipe-photos').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }

      const variants = wantsVariant && variantLabel.trim()
        ? [{
            id: `var_${Date.now()}`,
            label: variantLabel.trim(),
            ingredients: variantIngredientGroups.filter(g => g.items.length > 0),
            steps: variantStepGroups.filter(g => g.items.length > 0),
          }]
        : []

      const payload = {
        user_id,
        title: title.trim(),
        tagline: tagline.trim() || null,
        category: category.trim() || null,
        subcategory: subcategory.trim() || null,
        servings: servings ? parseInt(servings, 10) : null,
        total_minutes: totalMinutes ? parseInt(totalMinutes, 10) : null,
        ingredients: ingredientGroups.filter(g => g.items.length > 0),
        steps: stepGroups.filter(g => g.items.length > 0),
        variants,
        photo_url,
      }

      const { data, error: insertError } = await supabase.from('recipes').insert(payload).select().single()
      if (insertError) throw insertError
      onSaved?.(data)
    } catch (err) {
      setError(err.message || 'Something went wrong saving the recipe.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)', display: 'flex', flexDirection: 'column' }}>
      <WizardHeader stepIndex={stepIndex} total={STEPS.length} onClose={onClose} onBack={stepIndex > 0 ? goBack : null} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px' }}>
        {step === 'title' && (
          <TitleStep title={title} setTitle={setTitle} tagline={tagline} setTagline={setTagline} />
        )}
        {step === 'ingredients' && (
          <IngredientsStep
            groups={ingredientGroups} setGroups={setIngredientGroups}
            paste={ingredientPaste} setPaste={setIngredientPaste}
            showGrouping={showIngredientGrouping} setShowGrouping={setShowIngredientGrouping}
            existingGroups={existingGroups}
          />
        )}
        {step === 'steps' && (
          <StepsStep groups={stepGroups} setGroups={setStepGroups} paste={stepPaste} setPaste={setStepPaste} />
        )}
        {step === 'extras' && (
          <ExtrasStep
            servings={servings} setServings={setServings}
            totalMinutes={totalMinutes} setTotalMinutes={setTotalMinutes}
            category={category} setCategory={setCategory}
            subcategory={subcategory} setSubcategory={setSubcategory}
            existingCategories={existingCategories}
            photoPreview={photoPreview} onPhotoChange={handlePhotoChange}
          />
        )}
        {step === 'variant' && (
          <VariantStep
            wantsVariant={wantsVariant} setWantsVariant={setWantsVariant}
            variantLabel={variantLabel} setVariantLabel={setVariantLabel}
            groups={variantIngredientGroups} setGroups={setVariantIngredientGroups}
            paste={variantIngredientPaste} setPaste={setVariantIngredientPaste}
            stepGroups={variantStepGroups} setStepGroups={setVariantStepGroups}
            stepPaste={variantStepPaste} setStepPaste={setVariantStepPaste}
          />
        )}

        {error && (
          <div style={{
            marginTop: 16, padding: '10px 12px', borderRadius: 8, background: '#fbeae6',
            color: 'var(--tomato-deep)', fontSize: 13, fontFamily: 'var(--font-body)',
          }}>{error}</div>
        )}
      </div>

      <WizardFooter
        stepIndex={stepIndex}
        total={STEPS.length}
        canGoNext={canProceed(step, { title, ingredientGroups, stepGroups, wantsVariant, variantLabel })}
        onNext={stepIndex === STEPS.length - 1 ? handleSave : goNext}
        saving={saving}
        isLast={stepIndex === STEPS.length - 1}
      />
    </div>
  )
}

function canProceed(step, { title, ingredientGroups, stepGroups, wantsVariant, variantLabel }) {
  if (step === 'title') return title.trim().length > 0
  if (step === 'ingredients') return ingredientGroups.some(g => g.items.length > 0)
  if (step === 'steps') return stepGroups.some(g => g.items.length > 0)
  if (step === 'variant') return wantsVariant === null || wantsVariant === false || (wantsVariant === true && variantLabel.trim().length > 0)
  return true
}

function WizardHeader({ stepIndex, total, onClose, onBack }) {
  const labels = ['Title', 'Ingredients', 'Steps', 'Extras', 'Variant']
  return (
    <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line)', background: '#fffdf9' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        {onBack
          ? <button onClick={onBack} style={navBtnStyle}>‹ Back</button>
          : <div style={{ width: 50 }} />}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>
          {stepIndex + 1} / {total} — {labels[stepIndex]}
        </div>
        <button onClick={onClose} style={navBtnStyle}>Close</button>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= stepIndex ? 'var(--tomato)' : 'var(--line)',
          }} />
        ))}
      </div>
    </div>
  )
}

const navBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, width: 50, textAlign: 'left',
}

function WizardFooter({ stepIndex, total, canGoNext, onNext, saving, isLast }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, padding: '14px 20px', background: '#fffdf9',
      borderTop: '1px solid var(--line)',
    }}>
      <button
        onClick={onNext}
        disabled={!canGoNext || saving}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
          background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)',
          fontWeight: 700, fontSize: 15, cursor: canGoNext && !saving ? 'pointer' : 'default',
          opacity: canGoNext && !saving ? 1 : 0.5,
        }}
      >
        {saving ? 'Saving…' : isLast ? 'Save recipe' : 'Continue'}
      </button>
    </div>
  )
}
