import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'
import { markTemplateDuplicates, parseRecipeTemplate, saveTemplateRecipes } from '../lib/recipeTemplate'
import template from '../../docs/recipe-template.txt?raw'

export default function TemplateImportCard({ existingRecipes, onImported }) {
  const { lang } = useT()
  const nl = lang === 'nl'
  const [parsed, setParsed] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const input = useRef(null)
  const lock = useRef(false)
  const entries = parsed ? markTemplateDuplicates(parsed.recipes, existingRecipes) : []

  const download = () => {
    const url = URL.createObjectURL(new Blob([template], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'recipe-template.txt'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const readFile = async file => {
    if (!file || lock.current) return
    lock.current = true; setBusy(true); setParsed(null); setError(''); setMessage('')
    try {
      if (file.size > 500000) throw new Error(nl ? 'Gebruik een bestand kleiner dan 500 KB.' : 'Use a file smaller than 500 KB.')
      const result = parseRecipeTemplate(await file.text())
      setParsed(result)
      setSelected(new Set(markTemplateDuplicates(result.recipes, existingRecipes).filter(e => !e.duplicate).map(e => e.recipe.id)))
    } catch (err) { setError(err.message) }
    finally { lock.current = false; setBusy(false); if (input.current) input.current.value = '' }
  }
  const save = async () => {
    if (lock.current || !parsed || parsed.errors.length || !selected.size) return
    lock.current = true; setBusy(true); setError('')
    try {
      const count = await saveTemplateRecipes(supabase, parsed.recipes.filter(r => selected.has(r.id)))
      setParsed(null); setSelected(new Set())
      setMessage(nl ? `${count} recepten toegevoegd.` : `${count} recipes added.`)
      try { await onImported?.() } catch { setMessage(nl ? 'Opgeslagen. Vernieuw de pagina om je recepten te zien.' : 'Saved. Refresh the page to see your recipes.') }
    } catch (err) { setError(err.message) }
    finally { lock.current = false; setBusy(false) }
  }

  return (
    <div style={cardStyle} aria-labelledby="template-import-title">
      <div id="template-import-title" style={rowLabelStyle}>{nl ? 'Recepten uit een sjabloon' : 'Import recipes from a template'}</div>
      <div style={hintStyle}>{nl ? 'Download het sjabloon, vul het in en upload het. Bekijk alles voordat je opslaat. Geen AI nodig.' : 'Download the template, fill it in, then upload it. Review everything before saving. No AI needed.'}</div>
      <div style={hintStyle}>{nl ? 'Behoud de Engelse veldnamen; je recepten mogen in elke taal. Variaties worden als notities bewaard.' : 'Keep the English field labels; recipes can be in any language. Variations are saved as notes.'}</div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" onClick={download} style={{ ...secondaryBtnStyle, flex: 1 }}>
          {nl ? 'Sjabloon downloaden' : 'Download template'}
        </button>
        <label style={{ ...secondaryBtnStyle, flex: 1, display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>
          {nl ? 'Bestand kiezen (.txt)' : 'Choose file (.txt)'}
          <input
            ref={input} type="file" accept=".txt,text/plain" disabled={busy}
            onChange={e => readFile(e.target.files[0])}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: busy ? 'default' : 'pointer' }}
          />
        </label>
      </div>

      {error && <div role="alert" style={errorTextStyle}>{error}</div>}
      {message && <div role="status" style={doneStyle}>{message}</div>}

      {!!parsed?.errors.length && (
        <div role="alert" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--parchment-dim)', border: '1px solid var(--tomato)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--tomato-deep)', fontWeight: 600, marginBottom: 4 }}>
            {nl ? 'Pas deze regels aan en upload opnieuw:' : 'Fix these lines and upload again:'}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--tomato-deep)', lineHeight: 1.6 }}>
            {parsed.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {parsed && !parsed.errors.length && (
        <div style={{ marginTop: 12, border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
          <div style={hintStyle0}>
            {nl ? 'Mogelijke duplicaten staan standaard uit. Selecteer ze alleen als je een extra kopie wilt.' : 'Possible duplicates are unchecked. Select them only if you want another copy.'}
          </div>

          {entries.map(({ recipe: r, duplicate }) => (
            <article key={r.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer' }}>
                <input
                  type="checkbox" disabled={busy} checked={selected.has(r.id)}
                  onChange={e => setSelected(prev => {
                    const next = new Set(prev); if (e.target.checked) next.add(r.id); else next.delete(r.id); return next
                  })}
                />
                {r.title}
                {duplicate && <strong style={{ color: 'var(--tomato-deep)', fontWeight: 700 }}> · {nl ? 'Mogelijk duplicaat' : 'Possible duplicate'}</strong>}
              </label>
              <details style={{ marginTop: 4 }}>
                <summary style={summaryStyle}>{nl ? 'Recept bekijken' : 'Preview recipe'}</summary>
                <div style={{ marginTop: 8, paddingLeft: 4 }}>
                  <div style={hintStyle0}>
                    {[r.tagline, r.servings && `${r.servings} ${nl ? 'porties' : 'servings'}`, r.total_minutes && `${r.total_minutes} min`, r.category, r.subcategory, ...r.tags].filter(Boolean).join(' · ')}
                  </div>
                  {r.ingredients.map((g, i) => (
                    <div key={i} style={{ marginTop: 8 }}>
                      {g.group && <div style={groupTitleStyle}>{g.group}</div>}
                      <ul style={listStyle}>{g.items.map(item => <li key={item.id}>{[item.amount, item.unit, item.name, item.note].filter(v => v != null).join(' ')}</li>)}</ul>
                    </div>
                  ))}
                  {r.steps.map((g, i) => (
                    <div key={i} style={{ marginTop: 8 }}>
                      {g.group && <div style={groupTitleStyle}>{g.group}</div>}
                      <ol style={listStyle}>{g.items.map(item => <li key={item.id}>{item.content}</li>)}</ol>
                    </div>
                  ))}
                  {r.notes && <div style={{ ...noteStyle, whiteSpace: 'pre-wrap' }}>{r.notes}</div>}
                  {r.source && <div style={hintStyle0}>{r.source}</div>}
                </div>
              </details>
            </article>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" disabled={busy} onClick={() => { setParsed(null); setError('') }} style={{ ...secondaryBtnStyle, flex: 1 }}>
              {nl ? 'Annuleren' : 'Cancel'}
            </button>
            <button
              type="button" disabled={busy || !selected.size} onClick={save}
              style={{
                flex: 2, padding: '11px 0', borderRadius: 9, border: 'none',
                background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                cursor: busy || !selected.size ? 'default' : 'pointer', opacity: busy || !selected.size ? 0.5 : 1,
              }}
            >{busy ? (nl ? 'Opslaan…' : 'Saving…') : `${nl ? 'Importeren' : 'Import'} (${selected.size})`}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const cardStyle = {
  background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', marginBottom: 12,
}
const rowLabelStyle = { fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--charcoal)', marginBottom: 8 }
const hintStyle = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 4 }
const hintStyle0 = { ...hintStyle, marginTop: 0 }
const secondaryBtnStyle = {
  minHeight: 29, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--tomato)',
  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
  fontWeight: 700, fontSize: 14, cursor: 'pointer', textAlign: 'center',
}
const errorTextStyle = { fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--tomato-deep)', marginTop: 8 }
const doneStyle = { marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--sage-light)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)' }
const summaryStyle = { fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--tomato-deep)', cursor: 'pointer' }
const groupTitleStyle = { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 3 }
const listStyle = { margin: 0, paddingLeft: 18, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.5 }
const noteStyle = { marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.5 }
