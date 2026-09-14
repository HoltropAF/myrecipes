import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'
import TitleStep from './wizard/TitleStep'
import IngredientsStep from './wizard/IngredientsStep'
import StepsStep from './wizard/StepsStep'
import ExtrasStep from './wizard/ExtrasStep'
import VariantStep from './wizard/VariantStep'

const STEPS = ['title', 'ingredients', 'steps', 'extras', 'variant']

const MAX_PHOTO_BYTES = 8 * 1024 * 1024 // 8 MB

const emptyGroup = () => ({ group: null, items: [] })

// The bucket is public and served from our own domain, so only accept real
// raster images. An unchecked extension also let junk (or an SVG carrying
// script) through under a trusted-looking URL.
const ALLOWED_PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

async function uploadPhoto(file, userId, t, suffix = '') {
  const ext = ALLOWED_PHOTO_TYPES[file.type]
  if (!ext) throw new Error(t('wizard.photoTypeError'))
  if (file.size > MAX_PHOTO_BYTES) throw new Error(t('wizard.photoSizeError'))
  const path = `${userId}/${Date.now()}${suffix}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('recipe-photos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError
  const { data: urlData } = supabase.storage.from('recipe-photos').getPublicUrl(path)
  return urlData.publicUrl
}

export default function AddRecipeWizard({ onClose, onSaved, existingCategories = [], existingSubcategories = {}, existingGroups = [], existingTags = [], existingRecipe = null, prefillCategory = null, initialStep = 0 }) {
  const { t } = useT()
  const isEditing = !!existingRecipe
  const [stepIndex, setStepIndex] = useState(initialStep)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Form state — pre-filled from existingRecipe when editing
  const [title, setTitle] = useState(existingRecipe?.title || '')
  const [tagline, setTagline] = useState(existingRecipe?.tagline || '')

  const [ingredientGroups, setIngredientGroups] = useState(
    existingRecipe?.ingredients?.length ? existingRecipe.ingredients : [emptyGroup()]
  )
  const [ingredientPaste, setIngredientPaste] = useState('')
  const [showIngredientGrouping, setShowIngredientGrouping] = useState(
    (existingRecipe?.ingredients?.length || 0) > 1
  )

  const [stepGroups, setStepGroups] = useState(
    existingRecipe?.steps?.length ? existingRecipe.steps : [{ group: t('stepsStep.commonSections')[0], items: [] }]
  )
  // Keyed by group index — StepsStep renders one paste box per section.
  const [stepPaste, setStepPaste] = useState({})

  const [servings, setServings] = useState(existingRecipe?.servings ? String(existingRecipe.servings) : '')
  const [totalMinutes, setTotalMinutes] = useState(existingRecipe?.total_minutes ? String(existingRecipe.total_minutes) : '')
  const [category, setCategory] = useState(existingRecipe?.category || prefillCategory?.category || '')
  const [subcategory, setSubcategory] = useState(existingRecipe?.subcategory || prefillCategory?.subcategory || '')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(existingRecipe?.photo_url || null)
  const [notes, setNotes] = useState(existingRecipe?.notes || '')
  const [tags, setTags] = useState(existingRecipe?.tags || [])
  const [fridgeStorage, setFridgeStorage] = useState(existingRecipe?.fridge_storage || '')
  const [freezerFriendly, setFreezerFriendly] = useState(existingRecipe?.freezer_friendly ?? null)
  const [reheatInstructions, setReheatInstructions] = useState(existingRecipe?.reheat_instructions || '')
  const [prepAhead, setPrepAhead] = useState(existingRecipe?.prep_ahead || '')

  // Variants — support multiple (existing recipes like Gyoza/Tiramisu have several)
  const [variants, setVariants] = useState(existingRecipe?.variants || [])
  const [variantLabel, setVariantLabel] = useState('')
  const [variantIngredientGroups, setVariantIngredientGroups] = useState([emptyGroup()])
  const [variantIngredientPaste, setVariantIngredientPaste] = useState('')
  const [variantStepGroups, setVariantStepGroups] = useState([{ group: t('stepsStep.commonSections')[0], items: [] }])
  const [variantStepPaste, setVariantStepPaste] = useState('')
  const [variantPhotoFile, setVariantPhotoFile] = useState(null)
  const [variantPhotoPreview, setVariantPhotoPreview] = useState(null)

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

  // Pasted straight from e.g. a Google Images result — stored as a link rather
  // than uploaded, so nothing needs downloading to the device first.
  const handlePhotoUrlPaste = (url) => {
    setPhotoFile(null)
    setPhotoPreview(url)
  }

  const handleVariantPhotoChange = (file) => {
    setVariantPhotoFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setVariantPhotoPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setVariantPhotoPreview(null)
    }
  }

  const handleVariantPhotoUrlPaste = (url) => {
    setVariantPhotoFile(null)
    setVariantPhotoPreview(url)
  }

  const addCurrentVariant = () => {
    if (!variantLabel.trim()) return
    setVariants(prev => [...prev, {
      id: `var_${Date.now()}`,
      label: variantLabel.trim(),
      ingredients: variantIngredientGroups
        .map(g => ({ ...g, items: g.items.filter(item => item.name.trim().length > 0) }))
        .filter(g => g.items.length > 0),
      steps: variantStepGroups
        .map(g => ({ ...g, items: g.items.filter(item => item.content.trim().length > 0) }))
        .filter(g => g.items.length > 0),
      // photoFile is stripped and uploaded (or dropped if it's a pasted link
      // already) in handleSave — it can't be stored as JSON as-is.
      photoFile: variantPhotoFile,
      photo_url: variantPhotoFile ? null : variantPhotoPreview,
    }])
    setVariantLabel('')
    setVariantIngredientGroups([emptyGroup()])
    setVariantStepGroups([{ group: t('stepsStep.commonSections')[0], items: [] }])
    setVariantPhotoFile(null)
    setVariantPhotoPreview(null)
  }

  const removeVariant = (id) => setVariants(prev => prev.filter(v => v.id !== id))

  // Sets or replaces the photo on an already-saved variant, in place — the
  // compose form's photo picker only covers a variant while it's being built.
  const updateVariantPhoto = (variantId, file) => {
    if (!file) {
      setVariants(prev => prev.map(v => v.id === variantId ? { ...v, photoFile: null, photo_url: null } : v))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setVariants(prev => prev.map(v => v.id === variantId ? { ...v, photoFile: file, photo_url: reader.result } : v))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData?.user?.id
      if (!user_id) throw new Error('Not signed in')

      let photo_url = existingRecipe?.photo_url || null
      if (photoFile) {
        photo_url = await uploadPhoto(photoFile, user_id, t)
      } else {
        // No file to upload: photoPreview is either null (removed), an
        // unchanged existing photo_url, or a freshly pasted external link.
        photo_url = photoPreview
      }

      // Each variant may carry its own photo, uploaded (or kept as a pasted
      // link) the same way as the recipe's own photo.
      const finalVariants = []
      for (const variant of variants) {
        const { photoFile: variantFile, ...rest } = variant
        finalVariants.push({
          ...rest,
          photo_url: variantFile ? await uploadPhoto(variantFile, user_id, t, `-variant-${variant.id}`) : rest.photo_url,
        })
      }

      const payload = {
        user_id,
        title: title.trim(),
        tagline: tagline.trim() || null,
        category: category.trim() || null,
        subcategory: subcategory.trim() || null,
        servings: servings ? parseInt(servings, 10) : null,
        total_minutes: totalMinutes ? parseInt(totalMinutes, 10) : null,
        ingredients: ingredientGroups
          .map(g => ({ ...g, items: g.items.filter(item => item.name.trim().length > 0) }))
          .filter(g => g.items.length > 0),
        steps: stepGroups
          .map(g => ({ ...g, items: g.items.filter(item => item.content.trim().length > 0) }))
          .filter(g => g.items.length > 0),
        variants: finalVariants,
        notes: notes.trim() || null,
        tags,
        photo_url,
        fridge_storage: fridgeStorage.trim() || null,
        freezer_friendly: freezerFriendly,
        reheat_instructions: reheatInstructions.trim() || null,
        prep_ahead: prepAhead.trim() || null,
      }

      let data, saveError
      if (isEditing) {
        ;({ data, error: saveError } = await supabase
          .from('recipes')
          // updated_at only defaults on insert, so without this an edited recipe
          // keeps its original timestamp forever.
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', existingRecipe.id)
          .select()
          .single())
      } else {
        ;({ data, error: saveError } = await supabase.from('recipes').insert(payload).select().single())
      }
      if (saveError) throw saveError
      onSaved?.(data)
    } catch (err) {
      setError(err.message || 'Something went wrong saving the recipe.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)', display: 'flex', flexDirection: 'column' }}>
      <WizardHeader stepIndex={stepIndex} total={STEPS.length} onClose={onClose} onBack={stepIndex > 0 ? goBack : null} isEditing={isEditing} onJump={setStepIndex} />

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
            title={title}
            servings={servings} setServings={setServings}
            totalMinutes={totalMinutes} setTotalMinutes={setTotalMinutes}
            category={category} setCategory={cat => { setCategory(cat); setSubcategory('') }}
            subcategory={subcategory} setSubcategory={setSubcategory}
            existingCategories={existingCategories}
            existingSubcategories={existingSubcategories}
            photoPreview={photoPreview} onPhotoChange={handlePhotoChange} onPhotoUrlPaste={handlePhotoUrlPaste}
            notes={notes} setNotes={setNotes}
            tags={tags} setTags={setTags} existingTags={existingTags}
            fridgeStorage={fridgeStorage} setFridgeStorage={setFridgeStorage}
            freezerFriendly={freezerFriendly} setFreezerFriendly={setFreezerFriendly}
            reheatInstructions={reheatInstructions} setReheatInstructions={setReheatInstructions}
            prepAhead={prepAhead} setPrepAhead={setPrepAhead}
          />
        )}
        {step === 'variant' && (
          <VariantStep
            variantLabel={variantLabel} setVariantLabel={setVariantLabel}
            groups={variantIngredientGroups} setGroups={setVariantIngredientGroups}
            paste={variantIngredientPaste} setPaste={setVariantIngredientPaste}
            stepGroups={variantStepGroups} setStepGroups={setVariantStepGroups}
            stepPaste={variantStepPaste} setStepPaste={setVariantStepPaste}
            savedVariants={variants}
            onAddVariant={addCurrentVariant}
            onRemoveVariant={removeVariant}
            onUpdateVariantPhoto={updateVariantPhoto}
            photoPreview={variantPhotoPreview}
            onPhotoChange={handleVariantPhotoChange}
            onPhotoUrlPaste={handleVariantPhotoUrlPaste}
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
        canGoNext={canProceed(step, { title, ingredientGroups, stepGroups })}
        onNext={stepIndex === STEPS.length - 1 ? handleSave : goNext}
        saving={saving}
        isLast={stepIndex === STEPS.length - 1}
        isEditing={isEditing}
      />
    </div>
  )
}

function canProceed(step, { title, ingredientGroups, stepGroups }) {
  if (step === 'title') return title.trim().length > 0
  if (step === 'ingredients') return ingredientGroups.some(g => g.items.some(item => item.name.trim().length > 0))
  if (step === 'steps') return stepGroups.some(g => g.items.some(item => item.content.trim().length > 0))
  if (step === 'variant') return true // adding variants is optional and self-contained via its own button
  return true
}

function WizardHeader({ stepIndex, total, onClose, onBack, isEditing, onJump }) {
  const { t } = useT()
  const labels = t('wizard.steps')
  return (
    <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--line)', background: 'var(--card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {onBack
          ? <button onClick={onBack} style={navBtnStyle}>{t('wizard.back')}</button>
          : <div style={{ width: 50 }} />}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>
          {isEditing ? t('wizard.editing').replace(' — ', '') : `${stepIndex + 1} / ${total}`}
        </div>
        <button onClick={onClose} style={{ ...navBtnStyle, textAlign: 'right' }}>{t('wizard.close')}</button>
      </div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 1 }}>
        {labels.map((label, i) => {
          const isActive = i === stepIndex
          const canJump = isEditing || i <= stepIndex
          return (
            <button
              key={i}
              onClick={() => canJump && onJump(i)}
              style={{
                padding: '4px 9px', borderRadius: 6, flexShrink: 0,
                border: isActive ? '1.5px solid var(--tomato)' : '1.5px solid var(--line)',
                background: isActive ? 'var(--tomato)' : 'transparent',
                color: isActive ? 'var(--card)' : canJump ? 'var(--charcoal)' : 'var(--charcoal-soft)',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                cursor: canJump ? 'pointer' : 'default',
                opacity: canJump ? 1 : 0.35,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const navBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, width: 50, textAlign: 'left',
}

function WizardFooter({ canGoNext, onNext, saving, isLast, isEditing }) {
  const { t } = useT()
  return (
    <div style={{
      position: 'sticky', bottom: 0, padding: '14px 20px', background: 'var(--card)',
      borderTop: '1px solid var(--line)',
    }}>
      <button
        onClick={onNext}
        disabled={!canGoNext || saving}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
          background: 'var(--tomato)', color: 'var(--card)', fontFamily: 'var(--font-body)',
          fontWeight: 700, fontSize: 15, cursor: canGoNext && !saving ? 'pointer' : 'default',
          opacity: canGoNext && !saving ? 1 : 0.5,
        }}
      >
        {saving ? t('wizard.saving') : isLast ? (isEditing ? t('wizard.saveChanges') : t('wizard.saveRecipe')) : t('wizard.continue')}
      </button>
    </div>
  )
}
