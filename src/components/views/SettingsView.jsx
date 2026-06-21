import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { exportFullBackup, exportCookbookPDF } from '../../lib/exportUtils'

export default function SettingsView({
  userEmail, recipes = [],
  theme, onThemeChange,
  defaultCategory, onDefaultCategoryChange,
  pinWishlistFirst, onPinWishlistFirstChange,
  unitSystem, onToggleUnitSystem,
}) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

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

      {/* Account */}
      <SectionLabel>Account</SectionLabel>
      <div style={cardStyle}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 4 }}>signed in as</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--charcoal)' }}>{userEmail}</div>
      </div>

      {/* Appearance */}
      <SectionLabel>Appearance</SectionLabel>
      <div style={cardStyle}>
        <RowLabel>Theme</RowLabel>
        <SegmentedControl
          value={theme}
          onChange={onThemeChange}
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

      {/* Units */}
      <SectionLabel>Measurements</SectionLabel>
      <div style={cardStyle}>
        <RowLabel>Default units</RowLabel>
        <SegmentedControl
          value={unitSystem}
          onChange={(v) => v !== unitSystem && onToggleUnitSystem()}
          options={[
            { value: 'metric', label: 'g / ml' },
            { value: 'us', label: 'cup / oz' },
          ]}
        />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8 }}>
          You can still switch per-recipe with the button on any recipe page.
        </div>
      </div>

      {/* Filtering & display */}
      <SectionLabel>Filtering & display</SectionLabel>
      <div style={cardStyle}>
        <RowLabel>Default Cookbook category</RowLabel>
        <select
          value={defaultCategory || ''}
          onChange={e => onDefaultCategoryChange(e.target.value || null)}
          style={selectStyle}
        >
          <option value="">None — show all collapsed</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 8, marginBottom: 16 }}>
          This category opens automatically when you visit the Cookbook tab.
        </div>

        <ToggleRow
          label="Pin wishlist to top"
          sub="Show ⭐ wishlisted recipes first in the Recipes list"
          checked={pinWishlistFirst}
          onChange={onPinWishlistFirstChange}
        />
      </div>

      {/* Backup & export */}
      <SectionLabel>Backup & export</SectionLabel>
      <div style={cardStyle}>
        <RowLabel>Full data backup</RowLabel>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 10 }}>
          A JSON file with every recipe, cook log, shopping list, and meal group — for safekeeping or moving your data.
        </div>
        <button onClick={handleExportBackup} disabled={exporting} style={secondaryBtnStyle}>
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
        <button onClick={handleExportPDF} style={secondaryBtnStyle}>
          🖨 Export cookbook (PDF)
        </button>
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--line)',
          background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
          marginTop: 8,
        }}
      >Sign out</button>
    </div>
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
  width: '100%', padding: '10px 0', borderRadius: 9, border: '1px solid var(--tomato)',
  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
}
