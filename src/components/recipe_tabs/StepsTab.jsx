import { convertStepTemperatures } from '../../lib/unitConverter'

export default function StepsTab({ steps, unitSystem, onStartCooking }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionLabel>Steps</SectionLabel>
        {steps.length > 0 && (
          <button onClick={onStartCooking} style={{
            background: 'var(--tomato)', border: 'none', cursor: 'pointer', borderRadius: 99,
            color: '#fffdf9', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, padding: '6px 14px',
          }}>▶ Start cooking</button>
        )}
      </div>
      <div>
        {steps.length === 0 && <EmptyRow>No steps listed.</EmptyRow>}
        {steps.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 16 }}>
            {group.group && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{group.group}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.items.map((step, si) => (
                <div key={step.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 99, background: 'var(--tomato)', color: 'var(--card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 1,
                  }}>{si + 1}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--charcoal)', lineHeight: 1.5 }}>
                    {convertStepTemperatures(step.content, unitSystem)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
    }}>{children}</div>
  )
}

function EmptyRow({ children }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)', padding: '10px 0' }}>{children}</div>
}
