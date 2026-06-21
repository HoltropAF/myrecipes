import { useState } from 'react'
import { convertIngredient, convertStepTemperatures, formatConvertedAmount } from '../../lib/unitConverter'

const VARIANT_ICONS = ['🔸', '🔹', '⭐', '🔶', '🔷', '✨', '🟣', '🟢']

export default function VersionsTab({ recipe, variants, unitSystem }) {
  const [activeVariant, setActiveVariant] = useState('main')

  const active = activeVariant === 'main'
    ? { ingredients: recipe.ingredients || [], steps: recipe.steps || [] }
    : (variants.find(v => v.id === activeVariant) || { ingredients: [], steps: [] })

  return (
    <div>
      <SectionLabel>{variants.length + 1} versions of this recipe</SectionLabel>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
        <BigTabButton active={activeVariant === 'main'} onClick={() => setActiveVariant('main')}>
          🍽 Origineel
        </BigTabButton>
        {variants.map((v, i) => (
          <BigTabButton key={v.id} active={activeVariant === v.id} onClick={() => setActiveVariant(v.id)}>
            {VARIANT_ICONS[i % VARIANT_ICONS.length]} {v.label}
          </BigTabButton>
        ))}
      </div>

      {/* This variant's own ingredients */}
      <SectionLabel>Ingredients</SectionLabel>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '6px 16px', marginBottom: 22 }}>
        {active.ingredients.length === 0 && <EmptyRow>No ingredients listed for this version.</EmptyRow>}
        {active.ingredients.map((group, gi) => (
          <div key={gi} style={{ padding: '10px 0', borderBottom: gi < active.ingredients.length - 1 ? '1px solid var(--line)' : 'none' }}>
            {group.group && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{group.group}</div>
            )}
            {group.items.map(item => {
              const displayItem = convertIngredient(item, unitSystem)
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--charcoal)' }}>
                  {(displayItem.amount !== null || displayItem.unit) && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--tomato-deep)', fontWeight: 600, minWidth: 50, flexShrink: 0 }}>
                      {formatConvertedAmount(displayItem.amount)}{displayItem.unit ? ` ${displayItem.unit}` : ''}
                    </span>
                  )}
                  <span>{item.name}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* This variant's own steps */}
      <SectionLabel>Steps</SectionLabel>
      <div>
        {active.steps.length === 0 && <EmptyRow>No steps listed for this version.</EmptyRow>}
        {active.steps.map((group, gi) => (
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

function BigTabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: '12px 18px', borderRadius: 12, cursor: 'pointer',
        border: `2px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
        background: active ? 'var(--tomato)' : 'var(--card)',
        color: active ? 'var(--card)' : 'var(--charcoal)',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15,
        boxShadow: active ? '0 4px 10px rgba(193,67,47,0.25)' : 'none',
        transition: 'all 0.12s ease',
      }}
    >{children}</button>
  )
}
