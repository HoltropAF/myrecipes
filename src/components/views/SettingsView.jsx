import { useMemo, useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { exportFullBackup, exportCookbookPDF } from '../../lib/exportUtils'
import { parseBackup, summariseAgainst, importBackup, ImportError, IMPORT_TABLES } from '../../lib/importUtils'
import {
  formatBytes, readLocalStorageUsage, readCachedRecipeCount, readQuotaEstimate,
  clearLocalCaches, clearServiceWorkerCaches, readInstanceInfo,
} from '../../lib/storageInfo'
import { useT } from '../../lib/i18n'
import { ALLERGEN_LABELS } from '../../lib/recipeTags'
import './settings-view.css'

// Sentinel key for recipes with no category, so they can be selected in the
// PDF filter alongside real category names.
const UNCATEGORIZED = '__uncategorized__'

// What Settings search looks through. Hand-maintained rather than derived,
// because the point is to match what someone would *call* the thing — people
// look for "dark mode", not "theme", and for "Dutch", not "language".
//
// `extra` holds those alternative words in both languages; it is never shown.
const SEARCH_INDEX = [
  { section: 'general',    key: 'settings.aboutLabel',           extra: 'about account email sign out uitloggen account' },
  { section: 'general',    key: 'settings.linksLabel',           extra: 'github wiki issues instagram links' },
  { section: 'appearance', key: 'settings.themeLabel',           extra: 'theme dark light auto donker licht thema night mode' },
  { section: 'recipes',    key: 'settings.measurementsLabel',    extra: 'units metric us cups grams eenheden maten gram' },
  { section: 'appearance', key: 'settings.homeIconLabel',        extra: 'home button icon compass cookbook startknop icoon kompas kookboek' },
  { section: 'recipes',    key: 'settings.defaultViewLabel',     extra: 'view list folders cookbook weergave lijst mappen' },
  { section: 'recipes',    key: 'settings.searchBy',             extra: 'search ingredient title zoeken ingredient titel' },
  { section: 'recipes',    key: 'settings.cookbookLabel',        extra: 'category default open categorie standaard' },
  { section: 'tags',       key: 'settings.manageTags',           extra: 'tags labels recipe tags beheren' },
  { section: 'tags',       key: 'settings.manageAllergenTags',   extra: 'allergens allergy gluten dairy nuts allergenen lactose noten' },
  { section: 'backup',     key: 'settings.fullBackup',           extra: 'backup export json download reservekopie' },
  { section: 'backup',     key: 'settings.printableCookbook',    extra: 'pdf print cookbook printen kookboek' },
  { section: 'backup',     key: 'settings.importBackup',         extra: 'import restore merge replace herstellen importeren' },
  { section: 'backup',     key: 'settings.storageLabel',         extra: 'storage cache space offline opslag ruimte wissen' },
  { section: 'general',    key: 'settings.instanceLabel',        extra: 'instance version build supabase project versie' },
  { section: 'general',    key: 'settings.checkForUpdates',      extra: 'update upgrade new version bijwerken update versie nieuw' },
]

export default function SettingsView({
  userEmail, recipes = [], onRecipesChanged,
  theme, palette, defaultCategory, unitSystem,
  recipeViewMode, recipeSearchMode, compactMode, homeIcon,
  language,
  onSavePreferences,
  updateReady = false,
  onApplyUpdate,
  onCheckUpdate,
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
  const [tagsSubTab, setTagsSubTab] = useState('recipe')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  const saved = { theme, palette, defaultCategory, unitSystem, recipeViewMode, recipeSearchMode, compactMode, homeIcon, language }
  const savedKey = JSON.stringify(saved)

  const [draft, setDraft] = useState(saved)
  const [draftBase, setDraftBase] = useState(savedKey)

  // The local mirror must restart whenever saved preferences change underneath
  // it — which happens after preferences finish loading and after an immediate
  // save resolves. Adjusted during render rather than in an
  // effect: an effect would let one frame paint with a stale draft first, and
  // React handles a set-state-during-render by re-running this component
  // immediately, before anything reaches the screen.
  if (savedKey !== draftBase) {
    setDraftBase(savedKey)
    setDraft(saved)
  }

  const patch = (key, value) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    void onSavePreferences(next)
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

  return (
    <div className="settings-view">
      {/* Sticky header — title + binder-divider tabs, same pattern as RecipeDetail */}
      <div className="settings-view__head">
        <h1><SettingsGear />{t('settings.title')}</h1>

        <SettingsSearch
          sections={SECTIONS}
          onJump={(sectionId) => setActiveSection(sectionId)}
        />

        <nav className="settings-view__tabs">{SECTIONS.map(section => <button key={section.id} aria-selected={activeSection === section.id} onClick={() => setActiveSection(section.id)}>{section.label}</button>)}</nav>
      </div>

      {/* Content — background shade matches active tab */}
      <div className="settings-view__body">
        {activeSection === 'general' && (
          <GeneralSection
            userEmail={userEmail}
            updateReady={updateReady}
            onApplyUpdate={onApplyUpdate}
            onCheckUpdate={onCheckUpdate}
          />
        )}

        {activeSection === 'appearance' && (
          <>
            <SectionLabel>Theme</SectionLabel>
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
              <RowLabel>Background palette</RowLabel>
              <PaletteControl value={draft.palette || 'blush'} onChange={v => patch('palette', v)} />
            </div>

            <SectionLabel>Navigation</SectionLabel>
            <div style={cardStyle}>
              <RowLabel>{t('settings.homeIconChoice')}</RowLabel>
              <SegmentedControl
                value={draft.homeIcon}
                onChange={v => patch('homeIcon', v)}
                options={[
                  { value: 'compass',  label: t('settings.homeIconCompass') },
                  { value: 'cookbook', label: t('settings.homeIconCookbook') },
                ]}
              />
              <div style={hintStyle}>{t('settings.homeIconHint')}</div>
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

              <RowLabel>{t('settings.defaultUnits')}</RowLabel>
              <SegmentedControl
                value={draft.unitSystem}
                onChange={v => patch('unitSystem', v)}
                options={[
                  { value: 'metric', label: 'g / ml' },
                  { value: 'us',     label: 'cup / oz' },
                ]}
              />
              <div style={{ ...hintStyle, marginBottom: 16 }}>{t('settings.unitsHint')}</div>

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
            <div style={{ marginBottom: 16 }}>
              <SegmentedControl
                value={tagsSubTab}
                onChange={setTagsSubTab}
                options={[
                  { value: 'recipe',     label: t('settings.recipeTags') },
                  { value: 'allergen',   label: t('settings.allergenTagsTab') },
                ]}
              />
            </div>
            {tagsSubTab === 'recipe' && (
              <TagsSection recipes={recipes} onRecipesChanged={onRecipesChanged} />
            )}
            {tagsSubTab === 'allergen' && (
              <IngredientAllergenSection />
            )}
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

            <SectionLabel>{t('settings.restoreLabel')}</SectionLabel>
            <ImportBackupCard
              existingRecipes={recipes}
              onImported={onRecipesChanged}
            />

            <SectionLabel>{t('settings.onThisDevice')}</SectionLabel>
            <StorageCard />
          </>
        )}
      </div>

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

// Five tabs and ~850 lines is the point where "which tab was that on again?"
// stops being a rare question.
function SettingsSearch({ sections, onJump }) {
  const { t } = useT()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return SEARCH_INDEX
      .map(entry => ({ ...entry, label: t(entry.key) }))
      .filter(entry =>
        String(entry.label).toLowerCase().includes(q) || entry.extra.includes(q)
      )
      .slice(0, 6)
  }, [query, t])

  const sectionLabel = (id) => sections.find(s => s.id === id)?.label || id

  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('settings.searchPlaceholder')}
        style={{
          width: '100%', padding: '8px 11px', borderRadius: 8,
          border: '1px solid var(--line)', background: 'var(--parchment)',
          color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 13.5,
          boxSizing: 'border-box', outline: 'none',
        }}
      />
      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4,
          background: 'var(--card)', border: '1px solid var(--line-strong, var(--line))',
          borderRadius: 9, overflow: 'hidden', boxShadow: '0 8px 24px rgba(42,36,32,0.16)',
        }}>
          {results.map(result => (
            <button
              key={result.key}
              onClick={() => { onJump(result.section); setQuery('') }}
              style={{
                display: 'flex', width: '100%', alignItems: 'baseline', gap: 8,
                padding: '9px 12px', border: 'none', borderBottom: '1px solid var(--line)',
                background: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--charcoal)', flex: 1 }}>
                {result.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)' }}>
                {sectionLabel(result.section)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// "How much space is this taking" and "can I get it back", answerable without
// leaving the app.
function StorageCard() {
  const { t } = useT()
  const [usage, setUsage] = useState(() => readLocalStorageUsage())
  const [cachedCount, setCachedCount] = useState(() => readCachedRecipeCount())
  const [quota, setQuota] = useState(null)
  const [cleared, setCleared] = useState(null)

  useEffect(() => { readQuotaEstimate().then(setQuota) }, [])

  const refresh = () => {
    setUsage(readLocalStorageUsage())
    setCachedCount(readCachedRecipeCount())
    readQuotaEstimate().then(setQuota)
  }

  const handleClear = async () => {
    const removed = clearLocalCaches()
    await clearServiceWorkerCaches()
    refresh()
    setCleared(removed)
  }

  const quotaPct = quota?.quota ? Math.min(100, (quota.usage / quota.quota) * 100) : null

  return (
    <div style={cardStyle}>
      <RowLabel>{t('settings.storageLabel')}</RowLabel>
      <div style={hintStyle}>{t('settings.storageDesc')}</div>

      {quotaPct !== null && (
        <div style={{ margin: '4px 0 12px' }}>
          <div style={{ height: 7, borderRadius: 99, background: 'var(--parchment-dim)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.max(1, quotaPct)}%`, background: 'var(--sage)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)', marginTop: 5 }}>
            {formatBytes(quota.usage)} {t('settings.storageOf')} {formatBytes(quota.quota)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
        <StorageRow label={t('settings.storageRecipes')(cachedCount)} value={formatBytes(usage.recipeCache)} />
        <StorageRow label={t('settings.storageChecks')} value={formatBytes(usage.checkState)} />
        <StorageRow label={t('settings.storageSettings')} value={formatBytes(usage.flags)} />
      </div>

      <button onClick={handleClear} style={{ ...secondaryBtnStyle, width: '100%' }}>
        {t('settings.clearCache')}
      </button>
      <div style={{ ...hintStyle, marginTop: 6 }}>
        {cleared !== null ? t('settings.cacheCleared') : t('settings.clearCacheHint')}
      </div>
    </div>
  )
}

function StorageRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
      <span style={{ color: 'var(--charcoal-soft)' }}>{label}</span>
      <span style={{ color: 'var(--charcoal)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

// Which build and which database — the two things you need before you can
// report a problem on a self-hosted copy.
function InstanceCard({ updateReady, onApplyUpdate, onCheckUpdate }) {
  const { t } = useT()
  const info = useMemo(() => readInstanceInfo(), [])
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)

  // The update banner has a dismiss button, and dismissing it used to be the
  // end of the road until the next reload — there was nowhere else to update
  // from, and no way to tell whether you were already current.
  const handleCheck = async () => {
    setChecking(true)
    setResult(null)
    const outcome = await onCheckUpdate?.()
    setChecking(false)
    if (!outcome?.supported) setResult('unsupported')
    else if (outcome.failed) setResult('failed')
    else setResult(outcome.found ? 'found' : 'current')
  }

  const RESULT_TEXT = {
    current: t('settings.updateCurrent'),
    found: t('settings.updateFound'),
    failed: t('settings.updateCheckFailed'),
    unsupported: t('settings.updateUnsupported'),
  }

  return (
    <div style={cardStyle}>
      <RowLabel>{t('settings.instanceLabel')}</RowLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
        <StorageRow label={t('settings.instanceProject')} value={info.projectRef || t('settings.instanceUnknown')} />
        {info.buildDate && (
          <StorageRow label={t('settings.instanceBuild')} value={info.buildDate.slice(0, 10)} />
        )}
      </div>

      <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />

      {updateReady ? (
        <>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--tomato-deep)', fontWeight: 600, marginBottom: 8 }}>
            {t('settings.updateWaiting')}
          </div>
          <button
            onClick={onApplyUpdate}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 9, border: 'none',
              background: 'var(--tomato)', color: '#fffdf9',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >{t('settings.updateNow')}</button>
        </>
      ) : (
        <>
          <button
            onClick={handleCheck}
            disabled={checking}
            style={{ ...secondaryBtnStyle, width: '100%' }}
          >{checking ? t('settings.updateChecking') : t('settings.checkForUpdates')}</button>
          {result && (
            <div style={{
              ...hintStyle, marginTop: 6,
              color: result === 'current' ? 'var(--sage)' : 'var(--charcoal-soft)',
            }}>{RESULT_TEXT[result]}</div>
          )}
        </>
      )}

      <a
        href="https://github.com/HoltropAF/myrecipes/commits/main"
        target="_blank" rel="noopener noreferrer"
        style={{
          display: 'inline-block', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11.5,
          color: 'var(--tomato-deep)', fontWeight: 600, textDecoration: 'none',
        }}
      >{t('settings.instanceChangelog')}</a>
    </div>
  )
}

// Reading a backup back in. Deliberately three explicit stages — choose file,
// look at what's in it, then commit — because "replace" deletes everything the
// account currently has and that must never be one careless tap away.
function ImportBackupCard({ existingRecipes, onImported }) {
  const { t } = useT()
  const fileRef = useRef(null)
  const [parsed, setParsed] = useState(null)
  const [summary, setSummary] = useState(null)
  const [mode, setMode] = useState('merge')
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const reset = () => {
    setParsed(null); setSummary(null); setMode('merge')
    setConfirmText(''); setError(null); setProgress(null); setDone(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = async (file) => {
    if (!file) return
    setError(null); setDone(null)
    try {
      const text = await file.text()
      const result = parseBackup(text)
      setParsed(result)
      setSummary(summariseAgainst(result, existingRecipes))
    } catch (err) {
      reset()
      setError(err instanceof ImportError ? err.message : t('settings.importGenericError'))
    }
  }

  const handleImport = async () => {
    setBusy(true); setError(null); setProgress(null)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      const report = await importBackup(supabase, userId, parsed, {
        mode,
        onProgress: (step, i, total) => setProgress({ step, i, total }),
      })
      const restored = Object.values(report.inserted).reduce((a, b) => a + b, 0)
      setDone({ restored, mode })
      setParsed(null); setSummary(null); setConfirmText('')
      if (fileRef.current) fileRef.current.value = ''
      await onImported?.()
    } catch (err) {
      setError(err instanceof ImportError ? err.message : t('settings.importGenericError'))
    } finally {
      setBusy(false); setProgress(null)
    }
  }

  const replaceArmed = mode !== 'replace' || confirmText.trim().toUpperCase() === t('settings.importConfirmWord')

  return (
    <div style={cardStyle}>
      <RowLabel>{t('settings.importBackup')}</RowLabel>
      <div style={hintStyle}>{t('settings.importDesc')}</div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={e => handleFile(e.target.files?.[0])}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        style={{ ...secondaryBtnStyle, width: '100%' }}
      >{t('settings.chooseBackupFile')}</button>

      {error && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--tomato-deep)', marginTop: 8 }}>
          {error}
        </div>
      )}

      {done && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 8,
          background: 'var(--sage-light)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)',
        }}>{t('settings.importDone')(done.restored)}</div>
      )}

      {parsed && summary && (
        <div style={{ marginTop: 12, border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 8 }}>
            {t('settings.importFound')}
            {parsed.exportedAt && ` · ${parsed.exportedAt.slice(0, 10)}`}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {IMPORT_TABLES.filter(table => parsed.counts[table] > 0).map(table => (
              <div key={table} style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal)',
              }}>
                <span>{t(`settings.importTable.${table}`, table)}</span>
                <span style={{ fontWeight: 700 }}>
                  {parsed.counts[table]}
                  {table === 'recipes' && summary.newCount > 0 && (
                    <span style={{ color: 'var(--sage)', fontWeight: 600 }}> · {t('settings.importNew')(summary.newCount)}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <ModeButton active={mode === 'merge'} onClick={() => setMode('merge')}>
              {t('settings.importMerge')}
            </ModeButton>
            <ModeButton active={mode === 'replace'} onClick={() => setMode('replace')}>
              {t('settings.importReplace')}
            </ModeButton>
          </div>

          <div style={{ ...hintStyle, marginTop: 0 }}>
            {mode === 'merge' ? t('settings.importMergeHint') : t('settings.importReplaceHint')}
          </div>

          {mode === 'replace' && summary.willDelete > 0 && (
            <div style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 8,
              background: 'var(--parchment-dim)', border: '1px solid var(--tomato)',
            }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--tomato-deep)', fontWeight: 600 }}>
                {t('settings.importReplaceWarning')(summary.willDelete)}
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={t('settings.importConfirmWord')}
                style={{
                  width: '100%', marginTop: 8, padding: '8px 10px', borderRadius: 7,
                  border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--charcoal)',
                  fontFamily: 'var(--font-mono)', fontSize: 13, boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {progress && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 10 }}>
              {progress.step} {progress.total ? `${progress.i}/${progress.total}` : ''}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={reset} disabled={busy} style={{ ...secondaryBtnStyle, flex: 1 }}>
              {t('settings.importCancel')}
            </button>
            <button
              onClick={handleImport}
              disabled={busy || !replaceArmed}
              style={{
                flex: 2, padding: '11px 0', borderRadius: 9, border: 'none',
                background: mode === 'replace' ? 'var(--tomato-deep)' : 'var(--tomato)',
                color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                cursor: busy || !replaceArmed ? 'default' : 'pointer',
                opacity: busy || !replaceArmed ? 0.5 : 1,
              }}
            >{busy ? t('settings.importing') : t('settings.importStart')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
        background: active ? 'var(--tomato)' : 'var(--card)',
        color: active ? '#fffdf9' : 'var(--charcoal)',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
      }}
    >{children}</button>
  )
}

// One ingredient at a time, with a Confirm. 351 rows in a scrolling list reads
// as endless; a single card with a count left reads as finite.
//
// Mounted with key={row.id} so each ingredient gets a fresh component and the
// draft resets by itself, rather than syncing state in an effect.
function ReviewCard({ row, allergenKeys, busy, remaining, onConfirm, onSkip, onClose }) {
  const { t } = useT()
  const [tags, setTags] = useState(() => row.tags || [])

  const toggle = (key) => setTags(prev => (
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  ))

  return (
    <div style={{
      marginTop: 10, border: '1px solid var(--tomato)', borderRadius: 10,
      padding: '12px 13px', background: 'var(--card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--charcoal)' }}>
          {row.canonical_name}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)', flexShrink: 0 }}>
          {t('settings.reviewRemaining')(remaining)}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '10px 0' }}>
        {allergenKeys.map(key => {
          const on = tags.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              style={{
                padding: '4px 11px', borderRadius: 99, cursor: 'pointer',
                border: `1px solid ${on ? 'var(--tomato)' : 'var(--line)'}`,
                background: on ? 'var(--tomato)' : 'var(--card)',
                color: on ? '#fffdf9' : 'var(--charcoal-soft)',
                fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600,
              }}
            >{t(`allergens.${key}`, ALLERGEN_LABELS[key])}</button>
          )
        })}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)', marginBottom: 9 }}>
        {tags.length === 0 ? t('settings.reviewNoneHint') : t('settings.reviewSomeHint')}
      </div>

      <div style={{ display: 'flex', gap: 7 }}>
        <button onClick={onSkip} disabled={busy} style={{ ...secondaryBtnStyle, flex: 1 }}>
          {t('settings.reviewSkip')}
        </button>
        <button
          onClick={() => onConfirm(tags)}
          disabled={busy}
          style={{
            flex: 2, padding: '10px 0', borderRadius: 9, border: 'none',
            background: 'var(--sage)', color: '#fffdf9',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13.5,
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >{busy ? t('settings.reviewSaving') : t('settings.reviewConfirm')}</button>
      </div>

      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', marginTop: 7,
          color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11, width: '100%',
        }}
      >{t('settings.reviewStop')}</button>
    </div>
  )
}

function PdfFilterSheet({ recipes, onConfirm, onCancel }) {
  const { t } = useT()
  // Recipes with no category used to be silently unselectable — dropped by
  // filter(Boolean) here and by `selected.has(r.category)` below — so "Select
  // all" never actually meant all. UNCATEGORIZED stands in for null so they can
  // be included, matching the "Uncategorized" bucket generateCookbookHtml
  // already renders.
  const hasUncategorized = useMemo(() => recipes.some(r => !r.category), [recipes])
  const allCategories = useMemo(() => {
    const named = [...new Set(recipes.map(r => r.category).filter(Boolean))].sort()
    return hasUncategorized ? [...named, UNCATEGORIZED] : named
  }, [recipes, hasUncategorized])
  const [selected, setSelected] = useState(new Set(allCategories))

  const toggle = (cat) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    return next
  })

  const filtered = recipes.filter(r => selected.has(r.category || UNCATEGORIZED))

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
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', flex: 1 }}>
                {cat === UNCATEGORIZED ? t('settings.pdfFilter.uncategorized') : cat}
              </span>
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

function GeneralSection({ userEmail, updateReady, onApplyUpdate, onCheckUpdate }) {
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

      <SectionLabel>{t('settings.instanceSectionLabel')}</SectionLabel>
      <InstanceCard updateReady={updateReady} onApplyUpdate={onApplyUpdate} onCheckUpdate={onCheckUpdate} />

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
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false)
  const [tagError, setTagError] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  // Skipping is per-session and deliberately not persisted: "not now" should
  // not become "never ask again".
  const [skipped, setSkipped] = useState(() => new Set())

  const allergenKeys = Object.keys(ALLERGEN_LABELS)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('ingredient_tags')
        .select('id, canonical_name, tags, reviewed')
        .order('canonical_name')
      if (!cancelled) {
        setRows(data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const unreviewedCount = useMemo(() => rows.filter(r => !r.reviewed).length, [rows])

  const filtered = useMemo(() => {
    let list = rows
    if (onlyUnreviewed) list = list.filter(r => !r.reviewed)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(r => r.canonical_name.toLowerCase().includes(q))
    return list
  }, [rows, search, onlyUnreviewed])

  const toggleTag = async (row, key) => {
    setBusyId(row.id)
    const has = (row.tags || []).includes(key)
    const nextTags = has ? row.tags.filter(x => x !== key) : [...(row.tags || []), key]
    const { error } = await supabase
      .from('ingredient_tags')
      .update({ tags: nextTags, reviewed: true })
      .eq('id', row.id)
    if (error) setTagError(t('settings.tagSaveError'))
    else {
      setTagError(null)
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, tags: nextTags, reviewed: true } : r))
    }
    setBusyId(null)
  }

  const markNone = async (row) => {
    setBusyId(row.id)
    const { error } = await supabase
      .from('ingredient_tags')
      .update({ tags: [], reviewed: true })
      .eq('id', row.id)
    if (error) setTagError(t('settings.tagSaveError'))
    else {
      setTagError(null)
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, tags: [], reviewed: true } : r))
    }
    setBusyId(null)
  }

  const queue = useMemo(
    () => rows.filter(r => !r.reviewed && !skipped.has(r.id)),
    [rows, skipped]
  )
  const currentReview = queue[0] || null
  const reviewedCount = rows.length - unreviewedCount
  const progressPct = rows.length > 0 ? (reviewedCount / rows.length) * 100 : 0

  // One write per decision, unlike the inline list where every tag tap is its
  // own round trip — in the queue you set the whole answer, then confirm it.
  const saveReview = async (row, tags) => {
    setBusyId(row.id)
    const { error } = await supabase
      .from('ingredient_tags')
      .update({ tags, reviewed: true })
      .eq('id', row.id)
    if (error) setTagError(t('settings.tagSaveError'))
    else {
      setTagError(null)
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, tags, reviewed: true } : r))
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
      .insert({ canonical_name: clean, tags: [], reviewed: false })
      .select('id, canonical_name, tags, reviewed')
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

        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
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

        {rows.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>
                {t('settings.reviewProgress')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal)', fontWeight: 700 }}>
                {reviewedCount} / {rows.length}
              </span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: 'var(--parchment-dim)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(progressPct, 1)}%`, background: 'var(--sage)' }} />
            </div>

            {unreviewedCount > 0 && !reviewing && (
              <button
                onClick={() => { setReviewing(true); setSkipped(new Set()) }}
                style={{ ...secondaryBtnStyle, width: '100%', marginTop: 10 }}
              >{t('settings.startReview')(unreviewedCount)}</button>
            )}

            {reviewing && currentReview && (
              <ReviewCard
                key={currentReview.id}
                row={currentReview}
                allergenKeys={allergenKeys}
                busy={busyId === currentReview.id}
                remaining={queue.length}
                onConfirm={(tags) => saveReview(currentReview, tags)}
                onSkip={() => setSkipped(prev => new Set(prev).add(currentReview.id))}
                onClose={() => setReviewing(false)}
              />
            )}

            {reviewing && !currentReview && (
              <div style={{
                marginTop: 10, padding: '12px 14px', borderRadius: 9, background: 'var(--sage-light)',
                fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)',
              }}>
                {t('settings.reviewCleared')}
                <button
                  onClick={() => setReviewing(false)}
                  style={{ ...secondaryBtnStyle, width: '100%', marginTop: 8 }}
                >{t('settings.reviewDone')}</button>
              </div>
            )}
          </div>
        )}

        {tagError && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--tomato-deep)', marginBottom: 10 }}>
            {tagError}
          </div>
        )}

        <button
          onClick={() => setOnlyUnreviewed(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14,
            padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
            border: `1px solid ${onlyUnreviewed ? 'var(--tomato)' : 'var(--line)'}`,
            background: onlyUnreviewed ? 'var(--tomato)' : 'var(--card)',
            color: onlyUnreviewed ? '#fffdf9' : 'var(--charcoal-soft)',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
          }}
        >
          {t('settings.onlyUnreviewed')} {unreviewedCount > 0 && `(${unreviewedCount})`}
        </button>

        {loading && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>
            {t('settings.loading')}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>
            {onlyUnreviewed ? t('settings.allReviewed') : t('settings.noIngredientsFound')}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
          {filtered.map(row => {
            const hasNoTags = (row.tags || []).length === 0
            return (
              <div key={row.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--charcoal)' }}>
                    {row.canonical_name}
                  </span>
                  {!row.reviewed && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: 'var(--tomato-deep)', background: 'var(--tomato-light, rgba(196,90,60,0.12))',
                      borderRadius: 99, padding: '2px 7px',
                    }}>{t('settings.unreviewed')}</span>
                  )}
                  <button
                    onClick={() => deleteRow(row)} disabled={busyId === row.id}
                    style={{ ...linkBtnStyle, marginLeft: 'auto', color: 'var(--tomato)' }}
                  >{t('settings.delete')}</button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => markNone(row)}
                    disabled={busyId === row.id}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 10px', borderRadius: 99,
                      border: `1px solid ${row.reviewed && hasNoTags ? 'var(--charcoal)' : 'var(--line)'}`,
                      background: row.reviewed && hasNoTags ? 'var(--charcoal)' : 'var(--card)',
                      color: row.reviewed && hasNoTags ? '#fffdf9' : 'var(--charcoal-soft)',
                      cursor: 'pointer', fontWeight: 600,
                    }}
                  >{t('settings.none')}</button>
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
                      >{t(`allergens.${key}`, ALLERGEN_LABELS[key])}</button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', padding: '0 4px' }}>
        {t('settings.allergenTagsHint')}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--tomato-deep)', padding: '8px 4px 0',
        lineHeight: 1.5,
      }}>
        ⚠️ {t('settings.allergenDisclaimer')}
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
            flex: 1, height: 29, padding: '2px 0', borderRadius: 7, cursor: 'pointer',
            border: `1px solid ${value === opt.value ? 'var(--tomato)' : 'var(--line)'}`,
            background: value === opt.value ? 'var(--tomato)' : 'var(--card)',
            color: value === opt.value ? '#fffdf9' : 'var(--charcoal)',
            fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 9,
          }}
        >{opt.label}</button>
      ))}
    </div>
  )
}

function PaletteControl({ value, onChange }) {
  const palettes = [
    ['blush', 'Blush', '#b96f72'],
    ['forest', 'Forest', '#477a5e'],
    ['sunset', 'Sunset', '#dc704c'],
    ['ocean', 'Ocean', '#4f8995'],
    ['midnight', 'Midnight', '#7665a5'],
  ]
  return <div className="settings-palette">{palettes.map(([id, label, color]) => <button key={id} aria-pressed={value === id} onClick={() => onChange(id)}><i style={{ background: color }} />{label}</button>)}</div>
}

function SettingsGear() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>
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
  background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', marginBottom: 12,
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
  minHeight: 29, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--tomato)',
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
