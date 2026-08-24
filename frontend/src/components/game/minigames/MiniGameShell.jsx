import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import './MiniGames.css'

/**
 * Every mini-game renders its own gameplay area as `children`, and reports
 * completion via the parent's onComplete callback (passed straight through
 * to whichever game component is active). This shell just gives all three
 * games one consistent frame — title, short instructions, close button,
 * and a win/lose overlay — so switching between them never feels like a
 * different app.
 */
export default function MiniGameShell({ title, instructions, onClose, onFinish, result, children }) {
  const { t } = useLanguage()
  return (
    <div className="minigame-overlay">
      <div className="minigame-card">
        <div className="minigame-header">
          <h3>{title}</h3>
          <button className="minigame-close-btn" onClick={onClose} aria-label={t('minigames.close')}>
            ✕
          </button>
        </div>

        {instructions && !result && (
          <p className="minigame-instructions">{instructions}</p>
        )}

        {!result && <div className="minigame-body">{children}</div>}

        {/* Bails out of the game right now, banking whatever progress has
            been made so far as a completed (reduced-reward) task instead
            of forcing an outright win/loss -- see onFinish in each game
            component for how "current progress" is computed per game. */}
        {!result && onFinish && (
          <button className="minigame-finish-btn" onClick={onFinish}>
            {t('minigames.finish')}
          </button>
        )}

        {result && (
          <div className="minigame-result">
            <div className="minigame-result-icon">{result.success ? '🎉' : '😅'}</div>
            <p className="minigame-result-text">
              {result.success ? (result.message || t('minigames.nailedIt')) : (result.message || t('minigames.notQuiteGotIt'))}
            </p>
            <button className="minigame-result-btn" onClick={onClose}>
              {result.success ? t('minigames.collectReward') : t('minigames.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}