// Shared inline style objects.
//
// These lived as exports on TitleStep and CookLogForm, which made those files
// export non-components and broke fast refresh for every file importing them.
// They are plain values, so lib/ is where they belong.

export const titleStyle = {
  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24,
  color: 'var(--charcoal)', marginBottom: 20,
}

export const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6 }

export const labelTextStyle = {
  fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)',
}

// The wizard's fields are deliberately larger: 16px also stops iOS Safari
// zooming the page when a field takes focus.
export const inputStyle = {
  padding: '12px 13px', borderRadius: 9, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--charcoal)',
  fontFamily: 'var(--font-body)', fontSize: 16,
}

// Denser variant, for forms embedded in a card or a bottom sheet.
export const inputStyleCompact = {
  padding: '9px 11px', borderRadius: 8, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--charcoal)',
  fontFamily: 'var(--font-body)', fontSize: 14, width: '100%', boxSizing: 'border-box',
}
