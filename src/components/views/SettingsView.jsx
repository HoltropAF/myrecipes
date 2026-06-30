import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { exportFullBackup, exportCookbookPDF } from '../../lib/exportUtils'
import { useT } from '../../lib/i18n'
import { ALLERGEN_LABELS } from '../../lib/recipeTags'

const TAB_SHADES_LIGHT = ['#fffdf9', '#fdf6ec', '#fbf1e4', '#f8ecdb', '#f5e7d2']
const TAB_SHADES_DARK  = ['#2a221c', '#2e2620', '#322a23', '#362e26', '#3a3229']

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
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const check = () => setCompact(window.innerWidth <= 360)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
    } catch {
      setExportError(t('settings.backupError'))
    } finally {
      setExporting(false)
    }
  }

  const [showPdfFilter, setShowPdfFilter] = useState(false)
  const handleExportPDF = () => setShowPdfFilter(true)

  const categories = useMemo(
    () => [...new Set(recipes.map(r => r.category).filter(Boolean))].sort(),
    [recipes]
  )

  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  const TAB_SHADES = isDark ? TAB_SHADES_DARK : TAB_SHADES_LIGHT
  const activeSectionIndex = SECTIONS.findIndex(s => s.id === activeSection)

  return (
    <div>
      {/* Sticky header — title + binder-divider tabs, same pattern as RecipeDetail */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'var(--card)', borderBottom: '1px solid var(--line)',
        padding: '14px 16px 0',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600,
          color: 'var(--tomato-deep)', marginBottom: 14,
        }}>
          {t('settings.title')}
        </h1>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, overflowX: 'auto' }}>
          {SECTIONS.map((s, i) => {
            const isActive = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: isActive ? SECTIONS.length + 1 : SECTIONS.length - i,
                  marginLeft: i === 0 ? 0 : (compact ? -6 : -10),
                  padding: isActive
                    ? (compact ? '8px 12px 9px' : '10px 18px 11px')
                    : (compact ? '7px 10px 8px' : '8px 16px 9px'),
                  borderRadius: '10px 10px 0 0',
                  border: '1px solid var(--line)',
                  borderBottom: isActive
                    ? `1px solid ${TAB_SHADES[i % TAB_SHADES.length]}`
                    : '1px solid var(--line)',
                  background: TAB_SHADES[i % TAB_SHADES.length],
                  color: isActive ? 'var(--tomato-deep)' : 'var(--charcoal-soft)',
                  fontFamily: 'var(--font-display)', fontWeight: 600,
                  fontSize: compact ? (isActive ? 12.5 : 11.5) : (isActive ? 14 : 13),
                  cursor: 'pointer',
                  transform: isActive ? 'translateY(0)' : 'translateY(4px)',
                  boxShadow: isActive ? '0 -2px 8px rgba(42,36,32,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >{s.label}</button>
            )
          })}
        </div>
      </div>

      {/* Content — background shade matches active tab */}
      <div style={{
        padding: '20px 20px',
        paddingBottom: isDirty ? 90 : 100,
        background: TAB_SHADES[activeSectionIndex % TAB_SHADES.length],
        minHeight: 'calc(100dvh - 160px)',
      }}>
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
                onChange={v => patch('theme', v)}
                options={[
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'dark',  label: t('settings.themeDark') },
                  { value: 'auto',  label: t('settings.themeAuto') },
                ]}
              />
              <div style={hintStyle}>{t('settings.themeHint')}</div>
            </div>

            <SectionLabel>{t('settings.measurementsLabel')}</SectionLabel>
            <div style={cardStyle}>
              <RowLabel>{t('settings.defaultUnits')}</RowLabel>
              <SegmentedControl
                value={draft.unitSystem}
                onChange={v => patch('unitSystem', v)}
                options={[
                  { value: 'metric', label: 'g / ml' },
                  { value: 'us',     label: 'cup / oz' },
                ]}
              />
              <div style={hintStyle}>{t('settings.unitsHint')}</div>
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
                onChange={v => patch('recipeViewMode', v)}
                options={[
                  { value: 'folders', label: t('settings.viewCookbook') },
                  { value: 'list',    label: t('settings.viewList') },
                  { value: 'grid',    label: t('settings.viewGrid') },
                ]}
              />
              <div style={{ ...hintStyle, marginBottom: 16 }}>{t('settings.viewHint')}</div>

              <RowLabel>{t('settings.searchBy')}</RowLabel>
              <SegmentedControl
                value={draft.recipeSearchMode}
                onChange={v => patch('recipeSearchMode', v)}
                options={[
                  { value: 'title',      label: t('settings.searchByName') },
                  { value: 'ingredient', label: t('settings.searchByIngredient') },
                ]}
              />
              <div style={{ ...hintStyle, marginBottom: 16 }}>{t('settings.searchHint')}</div>

              <ToggleRow
                label={t('settings.compactMode')}
                sub={t('settings.compactSub')}
                checked={draft.compactMode}
                onChange={v => patch('compactMode', v)}
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
              <div style={hintStyle}>{t('settings.defaultCategoryHint')}</div>
            </div>
          </>
        )}

        {activeSection === 'tags' && (
          <>
            <TagsSection recipes={recipes} onRecipesChanged={onRecipesChanged} />
            <IngredientAllergenSection />
          </>
        )}

        {activeSection === 'backup' && (
          <>
            <SectionLabel>{t('settings.backupLabel')}</SectionLabel>
            <div style={cardStyle}>
              <RowLabel>{t('settings.fullBackup')}</RowLabel>
              <div style={hintStyle}>{t('settings.fullBackupDesc')}</div>
              <button onClick={handleExportBackup} disabled={exporting} style={{ ...secondaryBtnStyle, width: '100%' }}>
                {exporting ? t('settings.exporting') : t('settings.downloadBackup')}
              </button>
              {exportError && (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--tomato-deep)', marginTop: 6 }}>
                  {exportError}
                </div>
              )}

              <div style={{ height: 1, background: 'var(--line)', margin: '16px 0' }} />

              <RowLabel>{t('settings.printableCookbook')}</RowLabel>
              <div style={hintStyle}>{t('settings.printableDesc')(recipes.length)}</div>
              <button onClick={handleExportPDF} style={{ ...secondaryBtnStyle, width: '100%' }}>
                {t('settings.exportPDF')}
              </button>
            </div>
          </>
        )}
      </div>

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

      {showPdfFilter && (
        <PdfFilterSheet
          recipes={recipes}
          onConfirm={filtered => { setShowPdfFilter(false); exportCookbookPDF(filtered) }}
          onCancel={() => setShowPdfFilter(false)}
        />
      )}
    </div>
  )
}

function PdfFilterSheet({ recipes, onConfirm, onCancel }) {
  const { t } = useT()
  const allCategories = useMemo(
    () => [...new Set(recipes.map(r => r.category).filter(Boolean))].sort(),
    [recipes]
  )
  const [selected, setSelected] = useState(new Set(allCategories))

  const toggle = (cat) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    return next
  })

  const filtered = recipes.filter(r => selected.has(r.category))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(42,36,32,0.6)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--card)', width: '100%', borderRadius: '16px 16px 0 0', padding: '20px 20px 40px', maxHeight: '80dvh', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
          {t('settings.pdfFilter.title')}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 16 }}>
          {t('settings.pdfFilter.hint')(filtered.length)}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setSelected(new Set(allCategories))} style={smallToggleBtnStyle}>{t('settings.pdfFilter.all')}</button>
          <button onClick={() => setSelected(new Set())} style={smallToggleBtnStyle}>{t('settings.pdfFilter.none')}</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {allCategories.map(cat => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}>
              <input type="checkbox" checked={selected.has(cat)} onChange={() => toggle(cat)} style={{ width: 18, height: 18, accentColor: 'var(--tomato)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', flex: 1 }}>{cat}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>
                {recipes.filter(r => r.category === cat).length}
              </span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onCancel} style={{ ...secondaryBtnStyle, flex: 1 }}>{t('settings.cancel')}</button>
          <button
            onClick={() => onConfirm(filtered)}
            disabled={filtered.length === 0}
            style={{
              flex: 2, padding: '12px 0', borderRadius: 9, border: 'none',
              background: filtered.length === 0 ? 'var(--line)' : 'var(--tomato)',
              color: filtered.length === 0 ? 'var(--charcoal-soft)' : '#fffdf9',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
              cursor: filtered.length === 0 ? 'default' : 'pointer',
            }}
          >{t('settings.pdfFilter.export')(filtered.length)}</button>
        </div>
      </div>
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
        <LinkRow href="https://github.com/HoltropAF/myrecipes"        icon={<GitHubIcon />}    label="Repository" />
        <LinkRow href="https://github.com/HoltropAF/myrecipes/issues" icon={<GitHubIcon />}    label="Issues"     divider />
        <LinkRow href="https://github.com/HoltropAF/myrecipes/wiki"   icon={<WikiIcon />}      label="Wiki"       divider />
        <LinkRow href="https://instagram.com/AnnuhFloor"              icon={<InstagramIcon />} label="@AnnuhFloor" divider />
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--line)',
          background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
          fontWeight: 600, fontSize: 15, cursor: 'pointer', marginTop: 4,
        }}
      >{t('settings.signOut')}</button>
    </>
  )
}

function LinkRow({ href, icon, label, divider = false }) {
  return (
    <>
      {divider && <div style={{ height: 1, background: 'var(--line)' }} />}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0',
          fontFamily: 'var(--font-body)', color: 'var(--charcoal)', textDecoration: 'none',
        }}
      >
        {icon}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--charcoal-soft)', opacity: 0.4, fontSize: 16 }}>›</span>
      </a>
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

function WikiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="var(--charcoal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="var(--charcoal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

function IngredientAllergenSection() {
  const { t } = useT()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const allergenKeys = Object.keys(ALLERGEN_LABELS)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('ingredient_tags')
        .select('id, canonical_name, tags')
        .order('canonical_name')
      if (!cancelled) {
        setRows(data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.canonical_name.toLowerCase().includes(q))
  }, [rows, search])

  const toggleTag = async (row, key) => {
    setBusyId(row.id)
    const has = (row.tags || []).includes(key)
    const nextTags = has ? row.tags.filter(x => x !== key) : [...(row.tags || []), key]
    const { error } = await supabase.from('ingredient_tags').update({ tags: nextTags }).eq('id', row.id)
    if (!error) {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, tags: nextTags } : r))
    }
    setBusyId(null)
  }

  const deleteRow = async (row) => {
    setBusyId(row.id)
    const { error } = await supabase.from('ingredient_tags').delete().eq('id', row.id)
    if (!error) {
      setRows(prev => prev.filter(r => r.id !== row.id))
    }
    setBusyId(null)
  }

  const addIngredient = async () => {
    const clean = newName.trim().toLowerCase()
    if (!clean || adding) return
    if (rows.some(r => r.canonical_name.toLowerCase() === clean)) {
      setNewName('')
      return
    }
    setAdding(true)
    const { data, error } = await supabase
      .from('ingredient_tags')
      .insert({ canonical_name: clean, tags: [] })
      .select('id, canonical_name, tags')
      .single()
    if (!error && data) {
      setRows(prev => [...prev, data].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name)))
      setNewName('')
    }
    setAdding(false)
  }

  return (
    <>
      <SectionLabel>{t('settings.manageAllergenTags')}</SectionLabel>
      <div style={cardStyle}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('settings.searchIngredients')}
          style={{ ...inputLikeStyle, width: '100%', marginBottom: 10, boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <input
            type="text" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addIngredient() }}
            placeholder={t('settings.addIngredientPlaceholder')}
            style={{ ...inputLikeStyle, flex: 1, boxSizing: 'border-box' }}
          />
          <button onClick={addIngredient} disabled={!newName.trim() || adding} style={{ ...secondaryBtnStyle, flexShrink: 0 }}>
            {t('settings.add')}
          </button>
        </div>

        {loading && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>
            {t('settings.loading')}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>
            {t('settings.noIngredientsFound')}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
          {filtered.map(row => (
            <div key={row.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--charcoal)' }}>
                  {row.canonical_name}
                </span>
                <button
                  onClick={() => deleteRow(row)} disabled={busyId === row.id}
                  style={{ ...linkBtnStyle, marginLeft: 'auto', color: 'var(--tomato)' }}
                >{t('settings.delete')}</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {allergenKeys.map(key => {
                  const active = (row.tags || []).includes(key)
                  return (
                    <button
                      key={key}
                      onClick={() => toggleTag(row, key)}
                      disabled={busyId === row.id}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 10px', borderRadius: 99,
                        border: `1px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
                        background: active ? 'var(--tomato)' : 'var(--card)',
                        color: active ? '#fffdf9' : 'var(--charcoal-soft)',
                        cursor: 'pointer',
                      }}
                    >{t(`allergens.${key}`) || ALLERGEN_LABELS[key]}</button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', padding: '0 4px' }}>
        {t('settings.allergenTagsHint')}
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
const hintStyle = {
  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8,
}
const selectStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14,
}
const inputLikeStyle = {
  padding: '9px 12px', borderRadius: 9, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14,
}
const secondaryBtnStyle = {
  padding: '10px 14px', borderRadius: 9, border: '1px solid var(--tomato)',
  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
  fontWeight: 700, fontSize: 14, cursor: 'pointer', textAlign: 'center',
}
const linkBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, padding: 0,
}
const smallToggleBtnStyle = {
  padding: '6px 12px', borderRadius: 99, border: '1px solid var(--line)',
  background: 'var(--parchment-dim)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
