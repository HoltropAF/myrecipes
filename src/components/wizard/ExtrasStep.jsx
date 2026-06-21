import ComboInput from '../ComboInput'
import { titleStyle, labelStyle, labelTextStyle, inputStyle } from './TitleStep'

export default function ExtrasStep({
  servings, setServings, totalMinutes, setTotalMinutes,
  category, setCategory, subcategory, setSubcategory,
  existingCategories, photoPreview, onPhotoChange,
  notes, setNotes,
}) {
  return (
    <div>
      <h2 style={titleStyle}>A few extras (all optional)</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          <span style={labelTextStyle}>servings</span>
          <input
            type="number" inputMode="numeric" value={servings} onChange={e => setServings(e.target.value)}
            placeholder="4" min="1"
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          <span style={labelTextStyle}>total minutes</span>
          <input
            type="number" inputMode="numeric" value={totalMinutes} onChange={e => setTotalMinutes(e.target.value)}
            placeholder="30" min="1"
            style={inputStyle}
          />
        </label>
      </div>

      <label style={{ ...labelStyle, marginBottom: 14 }}>
        <span style={labelTextStyle}>category</span>
        <ComboInput value={category} onChange={setCategory} suggestions={existingCategories} placeholder="e.g. Pasta" />
      </label>

      <label style={{ ...labelStyle, marginBottom: 18 }}>
        <span style={labelTextStyle}>subcategory (optional)</span>
        <input
          type="text" value={subcategory} onChange={e => setSubcategory(e.target.value)}
          placeholder="e.g. Weeknight"
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>photo</span>
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
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100,
            borderRadius: 10, border: '2px dashed var(--line)', cursor: 'pointer', marginTop: 4,
            color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 13,
          }}>
            tap to add a photo
            <input type="file" accept="image/*" onChange={e => onPhotoChange(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          </label>
        )}
      </label>

      <label style={{ ...labelStyle, marginTop: 18 }}>
        <span style={labelTextStyle}>notes (optional)</span>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Tips, substitutions, variations…"
          rows={3}
          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
        />
      </label>
    </div>
  )
}
