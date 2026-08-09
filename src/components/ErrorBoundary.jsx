import { Component } from 'react'

// A chunk-load failure means a new deploy replaced the files this tab was
// precached against. That is not a bug to show the user — it just needs a reload.
function isChunkLoadError(error) {
  const message = String(error?.message || '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(message)
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error)) {
      // Reload once. The sessionStorage flag stops a broken deploy from putting
      // the app into an endless reload loop.
      try {
        if (!sessionStorage.getItem('mr_chunk_reloaded')) {
          sessionStorage.setItem('mr_chunk_reloaded', '1')
          window.location.reload()
        }
      } catch { /* storage unavailable — fall through to the error screen */ }
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        minHeight: '60dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 14, padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40 }}>🍳</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--tomato-deep)' }}>
          {this.props.title || 'Something went wrong here'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)', maxWidth: 320, lineHeight: 1.6 }}>
          {this.props.hint || 'The rest of the app still works — go back and try again.'}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '10px 18px', borderRadius: 10, border: '1px solid var(--line)',
              background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >Try again</button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >Reload</button>
        </div>
      </div>
    )
  }
}
