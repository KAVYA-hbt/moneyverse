import './GuidePanel.css'

/**
 * Purely a content display now — open/close is controlled entirely by
 * the ❓ button in the top bar (GamePage.jsx wraps this in .guide-anchor-
 * wrapper and only renders it at all when isOpen is true), so there's no
 * separate internal toggle affordance anymore.
 */
export default function GuidePanel({ isOpen, onToggle }) {
  if (!isOpen) return null

  return (
    <div className="gp-panel">
      <div className="gp-header">
        <span className="gp-header-title">Guide</span>
        <button className="gp-close-btn" onClick={onToggle}>✕</button>
      </div>

      <div className="gp-body">
        <div className="gp-section">
          <p className="gp-section-title">👤 Your Profile</p>
          <p className="gp-section-text">Top-left — tap it to see your profile or switch users.</p>
        </div>

        <div className="gp-section">
          <p className="gp-section-title">📊 The Top Bar</p>
          <p className="gp-section-text">
            Scenario, level, coins, tasks, streak, freezers, hint scrolls, and Trust — all live, updating as you play.
          </p>
        </div>

        <div className="gp-section">
          <p className="gp-section-title">💻 On Computer</p>
          <ul className="gp-key-list">
            <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</li>
            <li><kbd>E</kbd> Interact</li>
            <li><kbd>Esc</kbd> Close a menu</li>
          </ul>
        </div>

        <div className="gp-section">
          <p className="gp-section-title">📱 On Mobile</p>
          <ul className="gp-key-list">
            <li>🕹️ Joystick (bottom-left) — Move</li>
            <li>🎯 Button (bottom-right) — Interact</li>
            <li>🗺️ Map & Tasks — toggle the info panel</li>
          </ul>
        </div>
      </div>
    </div>
  )
}