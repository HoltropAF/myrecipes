import { useT } from '../lib/i18n'

// The date / version / thumbs / notes / save form, shared by the Log tab on a
// recipe (CookLogSection) and the quick-log bottom sheet (QuickLogCook). Both
// carried their own copy, including ThumbButton and the style constants.
//
// Fully controlled — the parent owns the state and the save handler, since the
// two callers insert into cook_log slightly differently.

export const labelTextStyle = {
  fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)',
}

export const inputStyle = {
  padding: '9px 11px', borderRadius: 8, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--charcoal)',
  fontFamily: 'var(--font-body)', fontSize: 14, width: '100%', boxSizing: 'border-box',
}

export function ThumbButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
        background: active ? 'var(--tomato)' : 'var(--card)',
        color: active ? 'var(--card)' : 'var(--charcoal)',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
      }}
    >{children}</button>
  )
}

// The bottom sheet gets a larger touch target than the inline form.
const SAVE_SIZES = {
  inline: { padding: '10px 0', fontSize: 14 },
  sheet:  { padding: '12px 0', fontSize: 15 },
}

export default function CookLogForm({
  date, setDate,
  variants = [],
  variantLabel, setVariantLabel,
  thumbs, setThumbs,
  notes, setNotes,
  onSave, saving = false, error = null,
  size = 'inline',
}) {
  const { t } = useT()
  const saveSize = SAVE_SIZES[size] || SAVE_SIZES.inline

  return (
    <>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
        <span style={labelTextStyle}>{t('cookLog.dateLabel')}</span>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
      </label>

      {variants.length > 0 && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
          <span style={labelTextStyle}>{t('cookLog.whichVersion')}</span>
          <select value={variantLabel} onChange={e => setVariantLabel(e.target.value)} style={inputStyle}>
            <option value="">{t('cookLog.original')}</option>
            {variants.map(v => <option key={v.id} value={v.label}>{v.label}</option>)}
          </select>
        </label>
      )}

      <div style={{ marginBottom: 12 }}>
        <span style={labelTextStyle}>{t('cookLog.howWasIt')}</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <ThumbButton active={thumbs === 'up'} onClick={() => setThumbs(thumbs === 'up' ? null : 'up')}>
            {t('cookLog.good')}
          </ThumbButton>
          <ThumbButton active={thumbs === 'down'} onClick={() => setThumbs(thumbs === 'down' ? null : 'down')}>
            {t('cookLog.notGreat')}
          </ThumbButton>
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
        <span style={labelTextStyle}>{t('cookLog.notesLabel')}</span>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder={t('cookLog.notesPlaceholder')}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>

      <button
        onClick={onSave} disabled={saving}
        style={{
          width: '100%', borderRadius: 9, border: 'none', cursor: saving ? 'default' : 'pointer',
          background: 'var(--tomato)', color: 'var(--card)',
          fontFamily: 'var(--font-body)', fontWeight: 700, opacity: saving ? 0.7 : 1,
          ...saveSize,
        }}
      >{saving ? t('cookLog.saving') : t('cookLog.save')}</button>

      {error && (
        <div style={{
          marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 13,
          color: 'var(--tomato-deep)', textAlign: size === 'sheet' ? 'center' : 'left',
        }}>{error}</div>
      )}
    </>
  )
}
