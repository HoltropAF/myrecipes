export default function TitleStep({ title, setTitle, tagline, setTagline }) {
  return (
    <div>
      <h2 style={titleStyle}>What are we making?</h2>
      <label style={labelStyle}>
        <span style={labelTextStyle}>recipe name</span>
        <input
          autoFocus
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Pasta spinazie blub"
          style={inputStyle}
        />
      </label>
      <label style={{ ...labelStyle, marginTop: 14 }}>
        <span style={labelTextStyle}>tagline (optional)</span>
        <input
          type="text" value={tagline} onChange={e => setTagline(e.target.value)}
          placeholder="Creamy pasta met boursin"
          style={inputStyle}
        />
      </label>
    </div>
  )
}

export const titleStyle = {
  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24,
  color: 'var(--charcoal)', marginBottom: 20,
}
export const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6 }
export const labelTextStyle = {
  fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)',
}
export const inputStyle = {
  padding: '12px 13px', borderRadius: 9, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 16,
}
