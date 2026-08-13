import './MiniGames.css'

/**
 * Every mini-game renders its own gameplay area as `children`, and reports
 * completion via the parent's onComplete callback (passed straight through
 * to whichever game component is active). This shell just gives all three
 * games one consistent frame — title, short instructions, close button,
 * and a win/lose overlay — so switching between them never feels like a
 * different app.
 */
export default function MiniGameShell({ title, instructions, onClose, result, children }) {
  return (
    <div className="minigame-overlay">
      <div className="minigame-card">
        <div className="minigame-header">
          <h3>{title}</h3>
          <button className="minigame-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {instructions && !result && (
          <p className="minigame-instructions">{instructions}</p>
        )}

        {!result && <div className="minigame-body">{children}</div>}

        {result && (
          <div className="minigame-result">
            <div className="minigame-result-icon">{result.success ? '🎉' : '😅'}</div>
            <p className="minigame-result-text">
              {result.success ? (result.message || 'Nailed it!') : (result.message || "Didn't quite get it — that's okay.")}
            </p>
            <button className="minigame-result-btn" onClick={onClose}>
              {result.success ? 'Collect Reward' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}