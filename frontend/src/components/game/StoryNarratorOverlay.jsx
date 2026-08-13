import './StoryNarratorOverlay.css'

/**
 * Deliberately no name tag, no character portrait — an abstract glowing
 * symbol instead, since this is "the story itself talking," not a
 * character. Kept at the TOP of the screen (Tutorial/Companion both sit
 * lower) so all three voices stay visually distinguishable by position
 * alone, not just styling.
 */
export default function StoryNarratorOverlay({ narrator }) {
  if (!narrator.isActive) return null

  return (
    <div className="sno-overlay">
      <div className="sno-card">
        <div className="sno-icon-badge">✨</div>

        <div className="sno-body">
          <p className="sno-line">{narrator.currentLine}</p>
          <button className="sno-advance-btn" onClick={narrator.advance}>
            {narrator.hasMoreLines ? 'Next' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}