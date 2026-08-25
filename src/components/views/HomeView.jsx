import { useState } from 'react'
import DecideCard from '../DecideCard'
import { useT } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { useBackLayer } from '../../lib/useBackLayer'
import './home-view.css'

export default function HomeView({ recipes, cookStats, onSelectRecipe, onAddRecipe, onLogCook, onOpenStats, isGuest }) {
  const { t } = useT()
  const [reportOpen, setReportOpen] = useState(false)
  useBackLayer(reportOpen, () => setReportOpen(false), 'feedback')
  return (
    <div className="recipe-home">
      <div className="recipe-home__landscape" aria-hidden="true"><i /><i /><i /></div>
      <header className="recipe-home__title" aria-hidden="true" />
      <section className="recipe-home__index">
        <h2 className="recipe-home__paper-title">
          <i aria-hidden="true" />
          <span><b>{t('home.indexTitle', 'Recipe index')}</b><small>{t('home.indexSubtitle', 'ways into your kitchen')}</small></span>
          <i aria-hidden="true" />
        </h2>
        <div className="recipe-home__bell"><DecideCard recipes={recipes} cookStats={cookStats} onSelect={onSelectRecipe} homeCompact /></div>
        {!isGuest && <>
          <HomeRow icon={<RecipeAddIcon />} label={t('fab.addRecipe')} hint={t('home.addRecipeHint', 'Save a new recipe')} onClick={onAddRecipe} />
          <HomeRow icon={<LogIcon />} label={t('fab.logCook')} hint={t('home.logHint', 'Remember what you made')} onClick={onLogCook} />
        </>}
        <HomeRow icon={<StatsIcon />} label={t('home.stats', 'Kitchen stats')} hint={t('home.statsHint', 'Favourites and forgotten gems')} breakLastWord onClick={onOpenStats} />
        {!isGuest && <HomeRow className="recipe-home__row--report" icon={<ReportIcon />} label="Report something" hint="Save a bug or idea for later" onClick={() => setReportOpen(true)} />}
      </section>
      {reportOpen && <FeedbackSheet onClose={() => setReportOpen(false)} />}
    </div>
  )
}

function HomeRow({ icon, label, hint, breakLastWord = false, className = '', onClick }) {
  let renderedHint = hint
  if (breakLastWord && typeof hint === 'string') {
    const splitAt = hint.lastIndexOf(' ')
    if (splitAt > 0) renderedHint = <>{hint.slice(0, splitAt)}<br />{hint.slice(splitAt + 1)}</>
  }
  return <button className={`recipe-home__row${breakLastWord ? ' recipe-home__row--tall' : ''} ${className}`.trim()} onClick={onClick}><span className="recipe-home__row-icon">{icon}</span><span><b>{label}</b><small>{renderedHint}</small></span><span className="recipe-home__arrow" aria-hidden="true">&gt;</span></button>
}

function FeedbackSheet({ onClose }) {
  const [kind, setKind] = useState('bug')
  const [message, setMessage] = useState('')
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (!message.trim() || state === 'saving') return
    setState('saving')
    setError('')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setError('Please sign in again before saving this report.')
      setState('idle')
      return
    }
    const { error: insertError } = await supabase.from('app_feedback').insert({
      user_id: user.id,
      kind,
      message: message.trim(),
      page: 'home',
      app_version: import.meta.env.VITE_APP_VERSION || null,
      context: {
        path: window.location.pathname,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        online: navigator.onLine,
      },
    })
    if (insertError) {
      setError('Could not save this yet. Please try again.')
      setState('idle')
      return
    }
    setState('saved')
  }

  return <div className="feedback-sheet" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <form className="feedback-sheet__panel" onSubmit={save} aria-labelledby="feedback-title">
      <button className="feedback-sheet__close" type="button" onClick={onClose} aria-label="Close">×</button>
      <h3 id="feedback-title">Report something</h3>
      <p>Leave it here so we can come back to it later.</p>
      <div className="feedback-sheet__types" aria-label="Report type">
        {[['bug', 'Bug'], ['looks_wrong', 'Looks wrong'], ['idea', 'Idea']].map(([value, label]) => <button key={value} type="button" className={kind === value ? 'is-active' : ''} onClick={() => setKind(value)}>{label}</button>)}
      </div>
      <label htmlFor="feedback-message">What happened, or what would you like?</label>
      <textarea id="feedback-message" value={message} onChange={event => setMessage(event.target.value)} maxLength="4000" placeholder="Write a short note…" required />
      <small>Page: Home · screen and app details are included</small>
      {error && <div className="feedback-sheet__error" role="alert">{error}</div>}
      {state === 'saved' ? <div className="feedback-sheet__saved" role="status">Saved — we can look at it later.</div> : <button className="feedback-sheet__save" type="submit" disabled={!message.trim() || state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save report'}</button>}
    </form>
  </div>
}

export function DinnerBellIcon({ size = 24 }) { return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 22h20M9 21c.4-6 3-9.5 7-10 4 .5 6.6 4 7 10M14 8h4M16 8V5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M4.5 24.5h23" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> }
function RecipeAddIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h10a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 9h6M12 6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
function LogIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function StatsIcon() { return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> }
function ReportIcon() { return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h14v12H9l-4 4V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 7v4m0 2.5v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
