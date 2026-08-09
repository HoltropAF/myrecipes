import { titleStyle, labelStyle, labelTextStyle, inputStyle } from '../../lib/formStyles'
import { useT } from '../../lib/i18n'

export default function TitleStep({ title, setTitle, tagline, setTagline }) {
  const { t } = useT()
  return (
    <div>
      <h2 style={titleStyle}>{t('titleStep.heading')}</h2>
      <label style={labelStyle}>
        <span style={labelTextStyle}>{t('titleStep.nameLabel')}</span>
        <input
          autoFocus
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Pasta spinazie blub"
          style={inputStyle}
        />
      </label>
      <label style={{ ...labelStyle, marginTop: 14 }}>
        <span style={labelTextStyle}>{t('titleStep.taglineLabel')}</span>
        <input
          type="text" value={tagline} onChange={e => setTagline(e.target.value)}
          placeholder="Creamy pasta met boursin"
          style={inputStyle}
        />
      </label>
    </div>
  )
}

