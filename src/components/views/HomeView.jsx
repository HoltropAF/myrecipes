import DecideCard from '../DecideCard'
import { useT } from '../../lib/i18n'
import './home-view.css'

export default function HomeView({ recipes, cookStats, onSelectRecipe, onAddRecipe, onLogCook, onOpenStats, isGuest }) {
  const { t } = useT()
  return (
    <div className="recipe-home">
      <div className="recipe-home__landscape" aria-hidden="true"><i /><i /><i /><i /></div>
      <header className="recipe-home__title">
        <span aria-hidden="true" />
        <span><h1>{t('home.indexTitle', 'Recipe index')}</h1><p>{t('home.indexSubtitle', 'ways into your kitchen')}</p></span>
        <span aria-hidden="true" />
      </header>
      <section className="recipe-home__index">
        <h2>{t('home.beginTitle', 'Where do we begin?')}</h2>
        <div className="recipe-home__bell"><DecideCard recipes={recipes} cookStats={cookStats} onSelect={onSelectRecipe} homeCompact /></div>
        {!isGuest && <>
          <HomeRow icon={<RecipeAddIcon />} label={t('fab.addRecipe')} hint={t('home.addRecipeHint', 'Save a new recipe')} onClick={onAddRecipe} />
          <HomeRow icon={<LogIcon />} label={t('fab.logCook')} hint={t('home.logHint', 'Remember what you made')} onClick={onLogCook} />
        </>}
        <HomeRow icon={<StatsIcon />} label={t('home.stats', 'Kitchen stats')} hint={t('home.statsHint', 'Favourites, repeats and forgotten gems')} breakLastWord onClick={onOpenStats} />
      </section>
    </div>
  )
}

function HomeRow({ icon, label, hint, breakLastWord = false, onClick }) {
  let renderedHint = hint
  if (breakLastWord && typeof hint === 'string') {
    const splitAt = hint.lastIndexOf(' ')
    if (splitAt > 0) renderedHint = <>{hint.slice(0, splitAt)}<br />{hint.slice(splitAt + 1)}</>
  }
  return <button className={`recipe-home__row${breakLastWord ? ' recipe-home__row--tall' : ''}`} onClick={onClick}><span className="recipe-home__row-icon">{icon}</span><span><b>{label}</b><small>{renderedHint}</small></span><span className="recipe-home__arrow" aria-hidden="true">&gt;</span></button>
}

export function DinnerBellIcon({ size = 24 }) { return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 22h20M9 21c.4-6 3-9.5 7-10 4 .5 6.6 4 7 10M14 8h4M16 8V5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M4.5 24.5h23" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> }
function RecipeAddIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h10a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 9h6M12 6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
function LogIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function StatsIcon() { return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> }
