import { useLanguage } from '../../i18n/LanguageContext.jsx'
import './GuidePanel.css'

/**
 * Purely a content display now — open/close is controlled entirely by
 * the ❓ button in the top bar (GamePage.jsx wraps this in .guide-anchor-
 * wrapper and only renders it at all when isOpen is true), so there's no
 * separate internal toggle affordance anymore.
 */
export default function GuidePanel({ isOpen, onToggle }) {
  const { t } = useLanguage()
  if (!isOpen) return null

  return (
    <div className="gp-panel">
      <div className="gp-header">
        <span className="gp-header-title">{t('guide.title')}</span>
        <button className="gp-close-btn" onClick={onToggle}>✕</button>
      </div>

      <div className="gp-body">
        <div className="gp-section">
          <p className="gp-section-title">{t('guide.profileTitle')}</p>
          <p className="gp-section-text">{t('guide.profileText')}</p>
        </div>

        <div className="gp-section">
          <p className="gp-section-title">{t('guide.topBarTitle')}</p>
          <p className="gp-section-text">
            {t('guide.topBarText')}
          </p>
        </div>

        <div className="gp-section">
          <p className="gp-section-title">{t('guide.computerTitle')}</p>
          <ul className="gp-key-list">
            <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> {t('guide.move')}</li>
            <li><kbd>E</kbd> {t('guide.interact')}</li>
            <li><kbd>Esc</kbd> {t('guide.closeMenu')}</li>
          </ul>
        </div>

        <div className="gp-section">
          <p className="gp-section-title">{t('guide.mobileTitle')}</p>
          <ul className="gp-key-list">
            <li>🕹️ {t('guide.joystickText')}</li>
            <li>🎯 {t('guide.buttonText')}</li>
            <li>🗺️ {t('guide.mapText')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}