import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_RECIPES } from '../lib/demoData'

export default function FirstRunWizard({ userId, onDone, setLanguage }) {
  const [step, setStep] = useState(0)
  const [lang, setLang] = useState('nl')
  const [units, setUnits] = useState('metric')
  const [importing, setImporting] = useState(false)

  const steps = [
    { id: 'lang',   emoji: '🌍' },
    { id: 'units',  emoji: '⚖️' },
    { id: 'import', emoji: '😉' },
  ]

  const finish = async (wantImport) => {
    setImporting(true)

    // Save preferences first
    await supabase.from('user_preferences').upsert({
      user_id: userId,
      language: lang,
      unit_system: units,
      updated_at: new Date().toISOString(),
    })

    // Apply language immediately in the app
    setLanguage(lang)

    // Import demo recipes if requested
    if (wantImport) {
      const now = new Date().toISOString()
      const rows = DEMO_RECIPES.map(r => ({
        user_id: userId,
        title: r.title,
        tagline: r.tagline || null,
        category: r.category || null,
        subcategory: r.subcategory || null,
        servings: r.servings || null,
        total_minutes: r.total_minutes || null,
        ingredients: r.ingredients,
        steps: r.steps,
        variants: r.variants || [],
        notes: r.notes || null,
        photo_url: r.photo_url || null,
        source: r.source || null,
        calories: r.calories || null,
        protein_g: r.protein_g || null,
        carbs_g: r.carbs_g || null,
        fat_g: r.fat_g || null,
        nutrition_is_estimate: r.nutrition_is_estimate ?? true,
        wishlist: r.wishlist ?? false,
        freezer_friendly: r.freezer_friendly ?? null,
        tags: r.tags || [],
        created_at: now,
        updated_at: now,
      }))
      await supabase.from('recipes').insert(rows)
    }

    setImporting(false)
    onDone()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99,
      background: 'var(--parchment)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '32px 24px',
    }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{
            width: i === step ? 24 : 8, height: 8, borderRadius: 99,
            background: i === step ? 'var(--tomato)' : i < step ? 'var(--tomato-deep)' : 'var(--line)',
            transition: 'all 0.2s ease',
          }} />
        ))}
      </div>

      <div style={{ maxWidth: 360, width: '100%' }}>

        {/* Step 0: Language */}
        {step === 0 && (
          <div>
            <div style={{ fontSize: 44, marginBottom: 14, textAlign: 'center' }}>🌍</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 8, textAlign: 'center' }}>
              Welcome / Welkom
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal-soft)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
              What language would you like? / Welke taal wil je gebruiken?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <LangButton active={lang === 'en'} onClick={() => setLang('en')}>
                🇬🇧 English
              </LangButton>
              <LangButton active={lang === 'nl'} onClick={() => setLang('nl')}>
                🇳🇱 Nederlands
              </LangButton>
            </div>
            <NextButton onClick={() => setStep(1)}>
              {lang === 'nl' ? 'Volgende →' : 'Next →'}
            </NextButton>
          </div>
        )}

        {/* Step 1: Units */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 44, marginBottom: 14, textAlign: 'center' }}>⚖️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 8, textAlign: 'center' }}>
              {lang === 'nl' ? 'Welke eenheden?' : 'Which units?'}
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal-soft)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
              {lang === 'nl'
                ? 'Je kunt dit later altijd wijzigen in Instellingen.'
                : "You can always change this later in Settings."}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <LangButton active={units === 'metric'} onClick={() => setUnits('metric')}>
                {lang === 'nl' ? '🌍 Metrisch (g, ml, kg)' : '🌍 Metric (g, ml, kg)'}
              </LangButton>
              <LangButton active={units === 'us'} onClick={() => setUnits('us')}>
                🇺🇸 US (cup, oz, lb)
              </LangButton>
            </div>
            <NextButton onClick={() => setStep(2)}>
              {lang === 'nl' ? 'Volgende →' : 'Next →'}
            </NextButton>
          </div>
        )}

        {/* Step 2: Import creator's recipes */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 44, marginBottom: 14, textAlign: 'center' }}>😉</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 8, textAlign: 'center' }}>
              {lang === 'nl' ? 'Recepten importeren?' : 'Import recipes?'}
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal-soft)', textAlign: 'center', marginBottom: 8, lineHeight: 1.6 }}>
              {lang === 'nl'
                ? `Wil je beginnen met ${DEMO_RECIPES.length} recepten van de maker van deze app? 😉`
                : `Want to start with ${DEMO_RECIPES.length} recipes from the app's creator? 😉`}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', textAlign: 'center', marginBottom: 28 }}>
              {lang === 'nl'
                ? 'Je kunt ze daarna gewoon verwijderen of aanpassen.'
                : 'You can always delete or edit them later.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => finish(true)}
                disabled={importing}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: importing ? 'default' : 'pointer',
                  background: 'var(--tomato)', color: '#fffdf9',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15,
                  opacity: importing ? 0.7 : 1,
                }}
              >
                {importing
                  ? (lang === 'nl' ? 'Importeren…' : 'Importing…')
                  : (lang === 'nl' ? '🍽 Ja graag!' : '🍽 Yes please!')}
              </button>
              <button
                onClick={() => finish(false)}
                disabled={importing}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, cursor: importing ? 'default' : 'pointer',
                  border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--charcoal)',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15,
                  opacity: importing ? 0.7 : 1,
                }}
              >
                {lang === 'nl' ? 'Nee, ik begin zelf' : 'No thanks, start fresh'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LangButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        border: `2px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
        background: active ? 'rgba(193,67,47,0.06)' : 'var(--card)',
        color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15,
        display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.12s ease',
      }}
    >{children}</button>
  )
}

function NextButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', marginTop: 24, padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
        background: 'var(--tomato)', color: '#fffdf9',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15,
      }}
    >{children}</button>
  )
}
