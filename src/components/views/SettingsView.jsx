import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { exportFullBackup, exportCookbookPDF } from '../../lib/exportUtils'

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'tags', label: 'Tags' },
  { id: 'backup', label: 'Backup' },
  { id: 'account', label: 'Account' },
]

export default function SettingsView({
  userEmail, recipes = [], onRecipesChanged,
  theme, defaultCategory, unitSystem,
  recipeViewMode, recipeSearchMode, compactMode,
  onSavePreferences,
}) {
  const [activeSection, setActiveSection] = useState('general')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Local draft copies — only written back via the Save bar, not on every change.
  const [draft, setDraft] = useState({
    theme, defaultCategory, unitSystem, recipeViewMode, recipeSearchMode, compactMode,
  })
  useEffect(() => {
    setDraft({ theme, defaultCategory, unitSystem, recipeViewMode, recipeSearchMode, compactMode })
  }, [theme, defaultCategory, unitSystem, recipeViewMode, recipeSearchMode, compactMode])

  const isDirty = (
    draft.theme !== theme ||
    draft.defaultCategory !== defaultCategory ||
    draft.unitSystem !== unitSystem ||
    draft.recipeViewMode !== recipeViewMode ||
    draft.recipeSearchMode !== recipeSearchMode ||
    draft.compactMode !== compactMode
  )

  const patch = (key, value) => setDraft(d => ({ ...d, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    await onSavePreferences(draft)
    setSaving(false)
  }

  const handleExportBackup = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const { data: userData } = await supabase.auth.getUser()
      await exportFullBackup(supabase, userData?.user?.id)
    } catch (err) {
      setExportError('Could not export backup — try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = () => {
    exportCookbookPDF(recipes)
  }

  const categories = useMemo(
    () => [...new Set(recipes.map(r => r.category).filter(Boolean))].sort(),
    [recipes]
  )

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }}>
        Settings
      </h1>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              flexShrink: 0, padding: '7px 13px', borderRadius: 99, cursor: 'pointer',
              border: `1px solid ${activeSection === s.id ? 'var(--tomato)' : 'var(--line)'}`,
              background: activeSection === s.id ? 'var(--tomato)' : 'var(--card)',
              color: activeSection === s.id ? '#fffdf9' : 'var(--charcoal-soft)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
            }}
          >{s.label}</button>
        ))}
      </div>

      {activeSection === 'general' && <GeneralSection />}

      {activeSection === 'appearance' && (
        <>
          <SectionLabel>Theme</SectionLabel>
          <div style={cardStyle}>
            <SegmentedControl
              value={draft.theme}
              onChange={(v) => patch('theme', v)}
              options={[
                { value: 'light', label: '☀️ Light' },
                { value: 'dark', label: '🌙 Dark' },
                { value: 'auto', label: '⚙️ Auto' },
              ]}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8 }}>
              Auto follows your phone's system setting.
            </div>
          </div>

          <SectionLabel>Measurements</SectionLabel>
          <div style={cardStyle}>
            <RowLabel>Default units</RowLabel>
            <SegmentedControl
              value={draft.unitSystem}
              onChange={(v) => patch('unitSystem', v)}
              options={[
                { value: 'metric', label: 'g / ml' },
                { value: 'us', label: 'cup / oz' },
              ]}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8 }}>
              You can still switch per-recipe with the button on any recipe page.
            </div>
          </div>
        </>
      )}

      {activeSection === 'recipes' && (
        <>
          <SectionLabel>Default view</SectionLabel>
          <div style={cardStyle}>
            <RowLabel>Browse as</RowLabel>
            <SegmentedControl
              value={draft.recipeViewMode}
              onChange={(v) => patch('recipeViewMode', v)}
              options={[
                { value: 'folders', label: 'Cookbook' },
                { value: 'list', label: 'List' },
              ]}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8, marginBottom: 16 }}>
              Cookbook groups recipes by category into folders. List shows a flat searchable list.
            </div>

            <RowLabel>Search by</RowLabel>
            <SegmentedControl
              value={draft.recipeSearchMode}
              onChange={(v) => patch('recipeSearchMode', v)}
              options={[
                { value: 'title', label: 'Name' },
                { value: 'ingredient', label: 'Ingredient' },
              ]}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8, marginBottom: 16 }}>
              How the search box on the Recipes tab matches your query.
            </div>

            <ToggleRow
              label="Compact mode"
              sub="Show only title, subtitle, and times cooked on recipe cards"
              checked={draft.compactMode}
              onChange={(v) => patch('compactMode', v)}
            />
          </div>

          <SectionLabel>Cookbook</SectionLabel>
          <div style={cardStyle}>
            <RowLabel>Default open category</RowLabel>
            <select
              value={draft.defaultCategory || ''}
              onChange={e => patch('defaultCategory', e.target.value || null)}
              style={selectStyle}
            >
              <option value="">None — show all collapsed</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8 }}>
              This category opens automatically when you visit the Cookbook view.
            </div>
          </div>
        </>
      )}

      {activeSection === 'tags' && (
        <TagsSection recipes={recipes} onRecipesChanged={onRecipesChanged} />
      )}

      {activeSection === 'backup' && (
        <>
          <SectionLabel>Backup & export</SectionLabel>
          <div style={cardStyle}>
            <RowLabel>Full data backup</RowLabel>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 10 }}>
              A JSON file with every recipe, cook log, shopping list, and meal group — for safekeeping or moving your data.
            </div>
            <button onClick={handleExportBackup} disabled={exporting} style={{ ...secondaryBtnStyle, width: '100%' }}>
              {exporting ? 'Exporting…' : '⬇ Download backup (.json)'}
            </button>
            {exportError && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--tomato-deep)', marginTop: 6 }}>{exportError}</div>
            )}

            <div style={{ height: 1, background: 'var(--line)', margin: '16px 0' }} />

            <RowLabel>Printable cookbook</RowLabel>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 10 }}>
              All {recipes.length} recipes as a print-ready PDF, organized by category with a table of contents.
            </div>
            <button onClick={handleExportPDF} style={{ ...secondaryBtnStyle, width: '100%' }}>
              🖨 Export cookbook (PDF)
            </button>
          </div>
        </>
      )}

      {activeSection === 'account' && (
        <>
          <SectionLabel>Account</SectionLabel>
          <div style={cardStyle}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 4 }}>signed in as</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--charcoal)' }}>{userEmail}</div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--line)',
              background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              marginTop: 8,
            }}
          >Sign out</button>
        </>
      )}

      {isDirty && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20,
          padding: '14px 20px', paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--card)', borderTop: '1px solid var(--line)',
          display: 'flex', gap: 10, boxShadow: '0 -4px 16px rgba(42,36,32,0.1)',
        }}>
          <button
            onClick={() => setDraft({ theme, defaultCategory, unitSystem, recipeViewMode, recipeSearchMode, compactMode })}
            style={{ ...secondaryBtnStyle, flex: 1 }}
          >Discard</button>
          <button
            onClick={handleSave} disabled={saving}
            style={{
              flex: 2, padding: '12px 0', borderRadius: 9, border: 'none',
              background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)',
              fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
            }}
          >{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}
    </div>
  )
}

function GeneralSection() {
  return (
    <>
      <SectionLabel>About</SectionLabel>
      <div style={cardStyle}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.6, marginBottom: 14 }}>
          myrecipes — your personal cookbook. Log what you cook, track what's worth making again, and keep every recipe organized in one place.
        </div>
        <a
          href="https://github.com/HoltropAF/myrecipes" target="_blank" rel="noreferrer"
          style={linkRowStyle}
        >
          <span>🐙</span><span>GitHub — github.com/HoltropAF/myrecipes</span>
        </a>
        <a
          href="https://instagram.com/AnnuhFloor" target="_blank" rel="noreferrer"
          style={{ ...linkRowStyle, marginTop: 4 }}
        >
          <span>📷</span><span>Instagram — @AnnuhFloor</span>
        </a>
      </div>
    </>
  )
}

function TagsSection({ recipes, onRecipesChanged }) {
  const [renaming, setRenaming] = useState(null) // tag string being renamed
  const [renameValue, setRenameValue] = useState('')
  const [busy, setBusy] = useState(false)

  const tagCounts = useMemo(() => {
    const counts = {}
    for (const r of recipes) {
      for (const t of (r.tags || [])) counts[t] = (counts[t] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [recipes])

  const startRename = (tag) => { setRenaming(tag); setRenameValue(tag) }

  const applyToRecipes = async (mapFn) => {
    setBusy(true)
    const affected = recipes.filter(r => (r.tags || []).length > 0)
    for (const r of affected) {
      const nextTags = mapFn(r.tags || [])
      if (JSON.stringify(nextTags) === JSON.stringify(r.tags || [])) continue
      await supabase.from('recipes').update({ tags: nextTags }).eq('id', r.id)
    }
    setBusy(false)
    onRecipesChanged?.()
  }

  const commitRename = async () => {
    const clean = renameValue.trim()
    const oldTag = renaming
    setRenaming(null)
    if (!clean || clean === oldTag) return
    await applyToRecipes(tags => {
      if (!tags.includes(oldTag)) return tags
      const next = tags.filter(t => t !== oldTag)
      if (!next.includes(clean)) next.push(clean)
      return next
    })
  }

  const deleteTag = async (tag) => {
    await applyToRecipes(tags => tags.filter(t => t !== tag))
  }

  return (
    <>
      <SectionLabel>Manage tags</SectionLabel>
      <div style={cardStyle}>
        {tagCounts.length === 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>
            No tags yet — add some while editing a recipe (e.g. "freezes well", "quick meal", "meal prep").
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tagCounts.map(([tag, count]) => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {renaming === tag ? (
                <>
                  <input
                    autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null) }}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--tomato)', fontFamily: 'var(--font-body)', fontSize: 13 }}
                  />
                  <button onClick={commitRename} disabled={busy} style={linkBtnStyle}>Save</button>
                  <button onClick={() => setRenaming(null)} style={linkBtnStyle}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sage)',
                    background: 'var(--sage-light)', borderRadius: 99, padding: '4px 10px',
                  }}>{tag}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>×{count}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                    <button onClick={() => startRename(tag)} disabled={busy} style={linkBtnStyle}>Rename</button>
                    <button onClick={() => deleteTag(tag)} disabled={busy} style={{ ...linkBtnStyle, color: 'var(--tomato)' }}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', padding: '0 4px' }}>
        Renaming or deleting here updates the tag on every recipe that has it. To add new tags, use the tag field when creating or editing a recipe.
      </div>
    </>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 18,
    }}>{children}</div>
  )
}

function RowLabel({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--charcoal)', marginBottom: 8 }}>
      {children}
    </div>
  )
}

function SegmentedControl({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
            border: `1px solid ${value === opt.value ? 'var(--tomato)' : 'var(--line)'}`,
            background: value === opt.value ? 'var(--tomato)' : 'var(--card)',
            color: value === opt.value ? '#fffdf9' : 'var(--charcoal)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
          }}
        >{opt.label}</button>
      ))}
    </div>
  )
}

function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--charcoal)' }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 46, height: 27, borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0,
          background: checked ? 'var(--tomato)' : 'var(--line)', position: 'relative', transition: 'background 0.15s ease',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 22 : 3, width: 21, height: 21, borderRadius: 99,
          background: '#fffdf9', transition: 'left 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }} />
      </button>
    </div>
  )
}

const cardStyle = {
  background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 4,
}
const selectStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14,
}
const secondaryBtnStyle = {
  padding: '10px 14px', borderRadius: 9, border: '1px solid var(--tomato)',
  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  textAlign: 'center',
}
const linkBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, padding: 0,
}
const linkRowStyle = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0',
  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', textDecoration: 'none',
}
