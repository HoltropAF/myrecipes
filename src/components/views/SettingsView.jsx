import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { exportFullBackup, exportCookbookPDF } from '../../lib/exportUtils'
import { useT } from '../../lib/i18n'

export default function SettingsView({
  userEmail, recipes = [], onRecipesChanged,
  theme, defaultCategory, unitSystem,
  recipeViewMode, recipeSearchMode, compactMode,
  language,
  onSavePreferences,
}) {
  const { t } = useT()

  const SECTIONS = [
    { id: 'general',    label: t('settings.general') },
    { id: 'appearance', label: t('settings.appearance') },
    { id: 'recipes',    label: t('settings.recipes') },
    { id: 'tags',       label: t('settings.tags') },
    { id: 'backup',     label: t('settings.backup') },
  ]

  const [activeSection, setActiveSection] = useState('general')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [draft, setDraft] = useState({
    theme, defaultCategory, unitSystem, recipeViewMode, recipeSearchMode, compactMode, language,
  })
  useEffect(() => {
    setDraft({ theme, defaultCategory, unitSystem, recipeViewMode, recipeSearchMode, compactMode, language })
  }, [theme, defaultCategory, unitSystem, recipeViewMode, recipeSearchMode, compactMode, language])

  const isDirty = (
    draft.theme !== theme ||
    draft.defaultCategory !== defaultCategory ||
    draft.unitSystem !== unitSystem ||
    draft.recipeViewMode !== recipeViewMode ||
    draft.recipeSearchMode !== recipeSearchMode ||
    draft.compactMode !== compactMode ||
    draft.language !== language
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
      setExportError(t('settings.backupError'))
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
        {t('settings.title')}
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

      {activeSection === 'general' && (
        <GeneralSection
          userEmail={userEmail}
          language={draft.language}
          onLanguageChange={v => patch('language', v)}
        />
      )}

      {activeSection === 'appearance' && (
        <>
          <SectionLabel>{t('settings.themeLabel')}</SectionLabel>
          <div style={cardStyle}>
            <SegmentedControl
              value={draft.theme}
              onChange={(v) => patch('theme', v)}
              options={[
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark',  label: t('settings.themeDark') },
                { value: 'auto',  label: t('settings.themeAuto') },
              ]}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8 }}>
              {t('settings.themeHint')}
            </div>
          </div>

          <SectionLabel>{t('settings.measurementsLabel')}</SectionLabel>
          <div style={cardStyle}>
            <RowLabel>{t('settings.defaultUnits')}</RowLabel>
            <SegmentedControl
              value={draft.unitSystem}
              onChange={(v) => patch('unitSystem', v)}
              options={[
                { value: 'metric', label: 'g / ml' },
                { value: 'us',     label: 'cup / oz' },
              ]}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8 }}>
              {t('settings.unitsHint')}
            </div>
          </div>
        </>
      )}

      {activeSection === 'recipes' && (
        <>
          <SectionLabel>{t('settings.defaultViewLabel')}</SectionLabel>
          <div style={cardStyle}>
            <RowLabel>{t('settings.browseAs')}</RowLabel>
            <SegmentedControl
              value={draft.recipeViewMode}
              onChange={(v) => patch('recipeViewMode', v)}
              options={[
                { value: 'folders', label: t('settings.viewCookbook') },
                { value: 'list',    label: t('settings.viewList') },
              ]}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8, marginBottom: 16 }}>
              {t('settings.viewHint')}
            </div>

            <RowLabel>{t('settings.searchBy')}</RowLabel>
            <SegmentedControl
              value={draft.recipeSearchMode}
              onChange={(v) => patch('recipeSearchMode', v)}
              options={[
                { value: 'title',      label: t('settings.searchByName') },
                { value: 'ingredient', label: t('settings.searchByIngredient') },
              ]}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8, marginBottom: 16 }}>
              {t('settings.searchHint')}
            </div>

            <ToggleRow
              label={t('settings.compactMode')}
              sub={t('settings.compactSub')}
              checked={draft.compactMode}
              onChange={(v) => patch('compactMode', v)}
            />
          </div>

          <SectionLabel>{t('settings.cookbookLabel')}</SectionLabel>
          <div style={cardStyle}>
            <RowLabel>{t('settings.defaultOpenCategory')}</RowLabel>
            <select
              value={draft.defaultCategory || ''}
              onChange={e => patch('defaultCategory', e.target.value || null)}
              style={selectStyle}
            >
              <option value="">{t('settings.defaultCategoryNone')}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8 }}>
              {t('settings.defaultCategoryHint')}
            </div>
          </div>
        </>
      )}

      {activeSection === 'tags' && (
        <TagsSection recipes={recipes} onRecipesChanged={onRecipesChanged} />
      )}

      {activeSection === 'backup' && (
        <>
          <SectionLabel>{t('settings.backupLabel')}</SectionLabel>
          <div style={cardStyle}>
            <RowLabel>{t('settings.fullBackup')}</RowLabel>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 10 }}>
              {t('settings.fullBackupDesc')}
            </div>
            <button onClick={handleExportBackup} disabled={exporting} style={{ ...secondaryBtnStyle, width: '100%' }}>
              {exporting ? t('settings.exporting') : t('settings.downloadBackup')}
            </button>
            {exportError && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--tomato-deep)', marginTop: 6 }}>{exportError}</div>
            )}

            <div style={{ height: 1, background: 'var(--line)', margin: '16px 0' }} />

            <RowLabel>{t('settings.printableCookbook')}</RowLabel>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 10 }}>
              {t('settings.printableDesc')(recipes.length)}
            </div>
            <button onClick={handleExportPDF} style={{ ...secondaryBtnStyle, width: '100%' }}>
              {t('settings.exportPDF')}
            </button>
          </div>
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
            onClick={() => setDraft({ theme, defaultCategory, unitSystem, recipeViewMode, recipeSearchMode, compactMode, language })}
            style={{ ...secondaryBtnStyle, flex: 1 }}
          >{t('settings.discard')}</button>
          <button
            onClick={handleSave} disabled={saving}
            style={{
              flex: 2, padding: '12px 0', borderRadius: 9, border: 'none',
              background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)',
              fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
            }}
          >{saving ? t('settings.savingBtn') : t('settings.saveChanges')}</button>
        </div>
      )}
    </div>
  )
}

function GeneralSection({ userEmail, language, onLanguageChange }) {
  const { t } = useT()
  return (
    <>
      <SectionLabel>{t('settings.aboutLabel')}</SectionLabel>
      <div style={cardStyle}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.6, marginBottom: 14 }}>
          {t('settings.aboutText')}
        </div>
        {userEmail && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--line)', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>{t('settings.signedInAs')}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', fontWeight: 600 }}>{userEmail}</span>
          </div>
        )}
      </div>

      <SectionLabel>{t('settings.languageLabel')}</SectionLabel>
      <div style={cardStyle}>
        <SegmentedControl
          value={language || 'en'}
          onChange={onLanguageChange}
          options={[
            { value: 'en', label: t('settings.langEn') },
            { value: 'nl', label: t('settings.langNl') },
          ]}
        />
      </div>

      <SectionLabel>{t('settings.linksLabel')}</SectionLabel>
      <div style={cardStyle}>
        <a href="https://github.com/HoltropAF/myrecipes" target="_blank" rel="noreferrer" style={linkRowStyle}>
          <GitHubIcon />
          <span>GitHub — github.com/HoltropAF/myrecipes</span>
        </a>
        <a href="https://instagram.com/AnnuhFloor" target="_blank" rel="noreferrer" style={{ ...linkRowStyle, marginTop: 4 }}>
          <InstagramIcon />
          <span>Instagram — @AnnuhFloor</span>
        </a>
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--line)',
          background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
        }}
      >{t('settings.signOut')}</button>
    </>
  )
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--charcoal)" style={{ flexShrink: 0 }}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.13-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.39.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="var(--tomato)" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.3" stroke="var(--tomato)" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.15" fill="var(--tomato)" />
    </svg>
  )
}

function TagsSection({ recipes, onRecipesChanged }) {
  const { t } = useT()
  const [renaming, setRenaming] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [busy, setBusy] = useState(false)

  const tagCounts = useMemo(() => {
    const counts = {}
    for (const r of recipes) {
      for (const tag of (r.tags || [])) counts[tag] = (counts[tag] || 0) + 1
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
      const next = tags.filter(tag => tag !== oldTag)
      if (!next.includes(clean)) next.push(clean)
      return next
    })
  }

  const deleteTag = async (tag) => {
    await applyToRecipes(tags => tags.filter(t => t !== tag))
  }

  return (
    <>
      <SectionLabel>{t('settings.manageTags')}</SectionLabel>
      <div style={cardStyle}>
        {tagCounts.length === 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>
            {t('settings.noTagsYet')}
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
                  <button onClick={commitRename} disabled={busy} style={linkBtnStyle}>{t('settings.save')}</button>
                  <button onClick={() => setRenaming(null)} style={linkBtnStyle}>{t('settings.cancel')}</button>
                </>
              ) : (
                <>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sage)',
                    background: 'var(--sage-light)', borderRadius: 99, padding: '4px 10px',
                  }}>{tag}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>×{count}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                    <button onClick={() => startRename(tag)} disabled={busy} style={linkBtnStyle}>{t('settings.rename')}</button>
                    <button onClick={() => deleteTag(tag)} disabled={busy} style={{ ...linkBtnStyle, color: 'var(--tomato)' }}>{t('settings.delete')}</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', padding: '0 4px' }}>
        {t('settings.tagsHint')}
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
