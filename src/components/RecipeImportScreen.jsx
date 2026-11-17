// Import screen: paste a link to get an AI prompt, or paste/upload a filled-in
// recipe template.

import { useState } from 'react'
import { useT } from '../lib/i18n'
import { recipeImportPrompt } from '../lib/recipeImportPrompt'
import template from '../../docs/recipe-template.txt?raw'
import TemplateImportCard from './TemplateImportCard'

export default function RecipeImportScreen({ recipes, onImported, onClose }) {
  const { lang } = useT()
  const nl = lang === 'nl'
  const [source, setSource] = useState('')
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState('')
  const prepare = async () => {
    try {
      const text = recipeImportPrompt(source, template)
      setPrompt(text)
      try {
        await navigator.clipboard.writeText(text)
        setStatus(nl ? 'Prompt gekopieerd.' : 'Prompt copied.')
      } catch { setStatus(nl ? 'Kopieer de prompt hieronder.' : 'Copy the prompt below.') }
    } catch (error) { setStatus(error.message) }
  }
  return <main style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
    <button type="button" onClick={onClose}>{nl ? 'Terug' : 'Back'}</button>
    <h1>{nl ? 'Recept importeren' : 'Import recipe'}</h1>
    <p>{nl ? 'Maak een prompt met je link voor Codex of ChatGPT. Plak daarna het ingevulde sjabloon hieronder of upload het tekstbestand. Bekijk het recept voordat je opslaat.' : 'Create a prompt with your link for Codex or ChatGPT. Then paste the completed template below or upload the text file. Review the recipe before saving.'}</p>
    <p>{nl ? 'Websites, Instagram, Pinterest en video’s: als de bron niet toegankelijk is, deel dan de tekst of het transcript in je chat.' : 'Websites, Instagram, Pinterest and videos: if the source is inaccessible, share its text or transcript in your chat.'}</p>
    <label style={{ display: 'block' }}>{nl ? 'Link naar recept of video' : 'Recipe or video link'}
      <input type="url" value={source} onChange={e => { setSource(e.target.value); setPrompt(''); setStatus('') }} placeholder="https://…" style={{ width: '100%', boxSizing: 'border-box', margin: '8px 0' }} />
    </label>
    <button type="button" onClick={prepare} disabled={!source.trim()}>{nl ? 'Prompt maken en kopiëren' : 'Create and copy prompt'}</button>
    {status && <p role="status">{status}</p>}
    {prompt && <label style={{ display: 'block' }}>{nl ? 'Prompt voor je chat' : 'Prompt for your chat'}<textarea readOnly value={prompt} rows={8} style={{ width: '100%', boxSizing: 'border-box' }} /></label>}
    <div style={{ marginTop: 20 }}><TemplateImportCard existingRecipes={recipes} onImported={onImported} /></div>
  </main>
}
