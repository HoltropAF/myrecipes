export default function LoadingGyoza({ label = 'loading…' }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 28, display: 'inline-block', animation: 'gyoza-spin 1.2s linear infinite' }}>🥟</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)', marginTop: 8 }}>{label}</div>
      <style>{`@keyframes gyoza-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
