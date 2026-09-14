import { useState } from 'react'
import TagPicker from '../TagPicker'
import { titleStyle, labelStyle, labelTextStyle, inputStyle } from '../../lib/formStyles'
import { useT } from '../../lib/i18n'

export default function ExtrasStep({
  title, servings, setServings, totalMinutes, setTotalMinutes,
  category, setCategory, subcategory, setSubcategory,
  existingCategories, existingSubcategories = {},
  photoPreview, onPhotoChange, onPhotoUrlPaste,
  notes, setNotes, tags, setTags, existingTags,
  fridgeStorage, setFridgeStorage, freezerFriendly, setFreezerFriendly,
  reheatInstructions, setReheatInstructions, prepAhead, setPrepAhead,
}) {
  const { t } = useT()
  const [photoUrlDraft, setPhotoUrlDraft] = useState('')
  const [photoUrlError, setPhotoUrlError] = useState(false)
  const imageSearchUrl = title?.trim()
    ? `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(title.trim())}`
    : null

  const submitPhotoUrl = () => {
    const url = photoUrlDraft.trim()
    if (!url) return
    if (!/^https?:\/\/.+/i.test(url)) { setPhotoUrlError(true); return }
    setPhotoUrlError(false)
    onPhotoUrlPaste(url)
    setPhotoUrlDraft('')
  }

  const subcategoryOptions = category ? (existingSubcategories[category] || []) : []

  return (
    <div>
      <h2 style={titleStyle}>{t('extrasStep.heading')}</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          <span style={labelTextStyle}>{t('extrasStep.servingsLabel')}</span>
          <input
            type="number" inputMode="numeric" value={servings} onChange={e => setServings(e.target.value)}
            placeholder="4" min="1"
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          <span style={labelTextStyle}>{t('extrasStep.minutesLabel')}</span>
          <input
            type="number" inputMode="numeric" value={totalMinutes} onChange={e => setTotalMinutes(e.target.value)}
            placeholder="30" min="1"
            style={inputStyle}
          />
        </label>
      </div>

      <div style={{ ...labelStyle, marginBottom: 14 }}>
        <span style={labelTextStyle}>{t('extrasStep.categoryLabel')}</span>
        <PickOrNew
          value={category}
          onChange={setCategory}
          options={existingCategories}
          placeholder={t('extrasStep.categoryPlaceholder', 'e.g. Main dishes')}
        />
      </div>

      <div style={{ ...labelStyle, marginBottom: 18 }}>
        <span style={labelTextStyle}>{t('extrasStep.subcategoryLabel')}</span>
        <PickOrNew
          value={subcategory}
          onChange={setSubcategory}
          options={subcategoryOptions}
          placeholder={t('extrasStep.subcategoryPlaceholder', 'e.g. Pasta')}
          disabled={!category}
          disabledHint={t('extrasStep.subcategoryHint', 'Pick a category first')}
        />
      </div>

      <label style={labelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={labelTextStyle}>{t('extrasStep.photoLabel')}</span>
          {imageSearchUrl && (
            <a
              href={imageSearchUrl} target="_blank" rel="noreferrer"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--tomato-deep)', textDecoration: 'none' }}
            >{t('extrasStep.searchImages')}</a>
          )}
        </div>
        {photoPreview ? (
          <div style={{ position: 'relative', marginTop: 4 }}>
            <img src={photoPreview} alt="" style={{ width: '100%', borderRadius: 10, display: 'block', maxHeight: 220, objectFit: 'cover' }} />
            <button
              onClick={() => onPhotoChange(null)}
              style={{
                position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 99,
                background: 'rgba(42,36,32,0.7)', color: 'var(--card)', border: 'none', cursor: 'pointer', fontSize: 16,
              }}
            >×</button>
          </div>
        ) : (
          <>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100,
              borderRadius: 10, border: '2px dashed var(--line)', cursor: 'pointer', marginTop: 4,
              color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 13,
            }}>
              {t('extrasStep.tapToAddPhoto')}
              <input type="file" accept="image/*" onChange={e => onPhotoChange(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </label>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                type="url" inputMode="url"
                value={photoUrlDraft}
                onChange={e => { setPhotoUrlDraft(e.target.value); setPhotoUrlError(false) }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitPhotoUrl() } }}
                placeholder={t('extrasStep.pastePhotoUrlPlaceholder')}
                style={{ ...inputStyle, flex: 1, padding: '9px 11px', fontSize: 14, borderColor: photoUrlError ? 'var(--tomato)' : 'var(--line)' }}
              />
              <button
                type="button" onClick={submitPhotoUrl} disabled={!photoUrlDraft.trim()}
                style={{
                  padding: '0 14px', borderRadius: 9, border: '1px solid var(--tomato)',
                  background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
                  fontWeight: 700, fontSize: 14, cursor: photoUrlDraft.trim() ? 'pointer' : 'default',
                  opacity: photoUrlDraft.trim() ? 1 : 0.5,
                }}
              >{t('extrasStep.usePhotoUrl')}</button>
            </div>
            {photoUrlError && (
              <div style={{ marginTop: 4, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--tomato-deep)' }}>
                {t('extrasStep.photoUrlError')}
              </div>
            )}
          </>
        )}
      </label>

      <label style={{ ...labelStyle, marginTop: 18 }}>
        <span style={labelTextStyle}>{t('extrasStep.notesLabel')}</span>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder={t('extrasStep.notesPlaceholder')}
          rows={3}
          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
        />
      </label>

      <label style={{ ...labelStyle, marginTop: 18 }}>
        <span style={labelTextStyle}>{t('extrasStep.tagsLabel')}</span>
        <TagPicker tags={tags} setTags={setTags} existingTags={existingTags} />
      </label>

      <div style={{ ...labelTextStyle, marginTop: 22, marginBottom: 6, fontWeight: 700 }}>
        {t('extrasStep.storageHeading')}
      </div>

      <label style={{ ...labelStyle, marginBottom: 14 }}>
        <span style={labelTextStyle}>{t('extrasStep.fridgeStorageLabel')}</span>
        <input
          type="text" value={fridgeStorage} onChange={e => setFridgeStorage(e.target.value)}
          placeholder={t('extrasStep.fridgeStoragePlaceholder')}
          style={inputStyle}
        />
      </label>

      <div style={{ ...labelStyle, marginBottom: 14 }}>
        <span style={labelTextStyle}>{t('extrasStep.freezerLabel')}</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[[true, 'freezerYes'], [false, 'freezerNo'], [null, 'freezerUnknown']].map(([value, key]) => (
            <button
              key={key} type="button" onClick={() => setFreezerFriendly(value)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
                border: `1px solid ${freezerFriendly === value ? 'var(--tomato)' : 'var(--line)'}`,
                background: freezerFriendly === value ? 'var(--tomato)' : 'var(--card)',
                color: freezerFriendly === value ? 'var(--card)' : 'var(--charcoal)',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
              }}
            >{t(`extrasStep.${key}`)}</button>
          ))}
        </div>
      </div>

      <label style={{ ...labelStyle, marginBottom: 14 }}>
        <span style={labelTextStyle}>{t('extrasStep.reheatLabel')}</span>
        <input
          type="text" value={reheatInstructions} onChange={e => setReheatInstructions(e.target.value)}
          placeholder={t('extrasStep.reheatPlaceholder')}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>{t('extrasStep.prepAheadLabel')}</span>
        <input
          type="text" value={prepAhead} onChange={e => setPrepAhead(e.target.value)}
          placeholder={t('extrasStep.prepAheadPlaceholder')}
          style={inputStyle}
        />
      </label>
    </div>
  )
}

// Dropdown that shows existing options + a "New…" option that reveals a text input.
function PickOrNew({ value, onChange, options, placeholder, disabled = false, disabledHint }) {
  const [open, setOpen] = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const [draft, setDraft] = useState('')

  const close = () => { setOpen(false); setAddingNew(false); setDraft('') }

  const select = (opt) => { onChange(opt); close() }

  const confirmNew = () => {
    if (draft.trim()) onChange(draft.trim())
    close()
  }

  if (disabled) {
    return (
      <div style={{
        padding: '9px 11px', borderRadius: 8, border: '1px solid var(--line)',
        background: 'var(--parchment-dim)', color: 'var(--charcoal-soft)',
        fontFamily: 'var(--font-body)', fontSize: 14,
      }}>{disabledHint || placeholder}</div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { if (!open) { setOpen(true); setAddingNew(false) } else close() }}
        style={{
          width: '100%', padding: '9px 11px', borderRadius: 8,
          border: `1px solid ${open ? 'var(--tomato)' : 'var(--line)'}`,
          background: 'var(--card)', color: value ? 'var(--charcoal)' : 'var(--charcoal-soft)',
          fontFamily: 'var(--font-body)', fontSize: 14, textAlign: 'left',
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--charcoal-soft)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(42,36,32,0.14)', overflow: 'hidden',
        }}>
          {/* Existing options */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {value && (
              <button type="button" onClick={() => select('')} style={optRowStyle(false)}>
                <span style={{ color: 'var(--charcoal-soft)', fontStyle: 'italic' }}>— clear</span>
              </button>
            )}
            {options.map(opt => (
              <button
                key={opt} type="button" onClick={() => select(opt)}
                style={optRowStyle(opt === value)}
              >
                {opt}
                {opt === value && <span style={{ marginLeft: 'auto', color: 'var(--tomato)', fontSize: 12 }}>✓</span>}
              </button>
            ))}
          </div>

          {/* Divider + Add new */}
          {options.length > 0 && <div style={{ height: 1, background: 'var(--line)' }} />}

          {addingNew ? (
            <div style={{ display: 'flex', gap: 6, padding: '8px 10px' }}>
              <input
                autoFocus
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmNew(); if (e.key === 'Escape') close() }}
                placeholder="Type name…"
                style={{
                  flex: 1, padding: '7px 9px', borderRadius: 7, border: '1px solid var(--tomato)',
                  background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                type="button" onClick={confirmNew}
                style={{
                  padding: '7px 12px', borderRadius: 7, border: 'none',
                  background: 'var(--tomato)', color: 'var(--card)',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >Add</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              style={{ ...optRowStyle(false), color: 'var(--tomato-deep)', fontWeight: 600 }}
            >
              + Add new…
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function optRowStyle(active) {
  return {
    display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px',
    border: 'none', background: active ? 'var(--parchment)' : 'none',
    cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14,
    color: 'var(--charcoal)', textAlign: 'left',
  }
}
