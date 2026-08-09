import { useT } from '../lib/i18n'

// Emoji picker + name field + Create button for a new collection. Previously
// duplicated between the CollectionsBar on the Recipes screen and the
// CollectionPicker sheet on a recipe, including two separate copies of the
// emoji list that could drift apart.
//
// Emoji here are user content (they decorate a collection the user named), which
// is why they're allowed — unlike structural navigation, which stays plain.
export const COLLECTION_EMOJIS = ['📚', '✨', '❤️', '🌟', '🍝', '🔥', '🌿', '🎉', '🧁', '☕', '🥗', '🍜']

export const DEFAULT_COLLECTION_EMOJI = '📚'

/**
 * @param onCancel  optional — renders a ✕ button when provided
 * @param compactPadding  the inline bar uses slightly tighter controls than the sheet
 */
export default function CollectionForm({
  name, setName, emoji, setEmoji, onCreate, onCancel, busy = false, compactPadding = false,
}) {
  const { t } = useT()
  const pad = compactPadding ? '8px' : '9px'

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {COLLECTION_EMOJIS.map(e => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            style={{
              fontSize: 18,
              border: emoji === e ? '2px solid var(--tomato)' : '2px solid transparent',
              background: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 4px',
            }}
          >{e}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onCreate()
            if (e.key === 'Escape') onCancel?.()
          }}
          placeholder={t('collections.namePlaceholder')}
          style={{
            flex: 1, padding: `${pad} 10px`, borderRadius: 8, border: '1px solid var(--line)',
            fontFamily: 'var(--font-body)', fontSize: 13,
            background: 'var(--parchment)', color: 'var(--charcoal)', outline: 'none',
          }}
        />
        <button
          onClick={onCreate}
          disabled={busy || !name.trim()}
          style={{
            padding: `${pad} 14px`, borderRadius: 8, border: 'none',
            background: 'var(--tomato)', color: '#fffdf9',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
            cursor: busy || !name.trim() ? 'default' : 'pointer',
            opacity: busy || !name.trim() ? 0.6 : 1,
          }}
        >{t('collections.create')}</button>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: `${pad} 10px`, borderRadius: 8, border: '1px solid var(--line)',
              background: 'none', color: 'var(--charcoal-soft)',
              fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
            }}
          >✕</button>
        )}
      </div>
    </div>
  )
}
