import DecideCard from '../DecideCard'
import { useT } from '../../lib/i18n'

export default function HomeView({ recipes, cookStats, onSelectRecipe, onAddRecipe, onLogCook, onOpenStats, isGuest }) {
  const { t } = useT()
  return (
    <div style={{ padding: '0 20px 100px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
        <span style={{ width: 54, height: 54, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--tomato)', color: '#fffdf9', boxShadow: '0 7px 18px rgba(193,67,47,.25)' }}><DinnerBellIcon size={30} /></span>
        <span><small style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--charcoal-soft)' }}>{t('home.eyebrow', 'What shall we cook?')}</small><h1 style={{ margin: '3px 0 0', fontFamily: 'var(--font-display)', fontSize: 27, lineHeight: 1, color: 'var(--tomato-deep)' }}>{t('home.title', 'Dinner bell')}</h1></span>
      </header>
      <DecideCard recipes={recipes} cookStats={cookStats} onSelect={onSelectRecipe} />
      {!isGuest && <section style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}><h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--tomato-deep)' }}>{t('home.addTitle', 'Add to your kitchen')}</h2><small style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)' }}>{t('home.addHint', 'Keep it close')}</small></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <button onClick={onAddRecipe} style={actionStyle}><RecipeAddIcon /><span><b>{t('fab.addRecipe')}</b><small>{t('home.addRecipeHint', 'Save a new recipe')}</small></span></button>
          <button onClick={onLogCook} style={{ ...actionStyle, background: 'var(--parchment-dim)', color: 'var(--tomato-deep)' }}><LogIcon /><span><b>{t('fab.logCook')}</b><small>{t('home.logHint', 'Remember what you made')}</small></span></button>
        </div>
      </section>}
      <button onClick={onOpenStats} style={{ width: '100%', marginTop: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--card)', color: 'var(--charcoal)', cursor: 'pointer', textAlign: 'left' }}><StatsIcon /><span style={{ flex: 1 }}><b style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 14 }}>{t('home.stats', 'Kitchen stats')}</b><small style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)' }}>{t('home.statsHint', 'Favourites, repeats and forgotten gems')}</small></span><span aria-hidden="true">›</span></button>
    </div>
  )
}

export function DinnerBellIcon({ size = 24 }) { return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 22h20M9 21c.4-6 3-9.5 7-10 4 .5 6.6 4 7 10M14 8h4M16 8V5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M4.5 24.5h23" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> }
function RecipeAddIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h10a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 9h6M12 6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
function LogIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function StatsIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> }
const actionStyle = { minHeight: 88, padding: 13, border: 'none', borderRadius: 15, background: 'var(--tomato)', color: '#fffdf9', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', textAlign: 'left' }
