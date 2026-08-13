import './CompanionDialogueModal.css'

const SPEAKER_LABELS = {
  companion: null, // filled in by caller with the actual companion name
  npc: 'Citizen',
  mayor: 'Mayor',
}

const SPEAKER_ICONS = {
  companion: '🤖',
  npc: '🧑',
  mayor: '👑',
}

/**
 * Full-width bar anchored to the bottom edge of the screen. Two portraits
 * overlap its top corners — whoever is currently speaking (companion/npc/
 * mayor) on the left, the player's own avatar + name fixed on the right —
 * so it reads as a real two-person conversation rather than one character
 * talking at an empty space. The text + any option buttons sit centered
 * between them.
 */
export default function CompanionDialogueModal({ narrative, companionName, playerName }) {
  if (!narrative.isActive) return null

  const speakerLabel =
    narrative.speaker === 'companion' ? (companionName || 'Companion') : SPEAKER_LABELS[narrative.speaker]

  return (
    <div className="cdm-bar">
      <div className="cdm-portrait-col cdm-portrait-col--speaker">
        <div className={`cdm-portrait cdm-portrait--${narrative.speaker}`}>
          {SPEAKER_ICONS[narrative.speaker] || '💬'}
        </div>
        <span className={`cdm-name-tag cdm-name-tag--${narrative.speaker}`}>{speakerLabel}</span>
      </div>

      <div className="cdm-text-col">
        <p className="cdm-line">{narrative.currentLine}</p>

        {narrative.options ? (
          <div className="cdm-options">
            {narrative.options.map((opt) => (
              <button key={opt.value} className="cdm-option-btn" onClick={() => narrative.selectOption(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <button className="cdm-continue-btn" onClick={narrative.advance}>
            {narrative.hasMoreLines ? 'Continue' : 'Okay'}
          </button>
        )}
      </div>

      <div className="cdm-portrait-col cdm-portrait-col--player">
        <div className="cdm-portrait cdm-portrait--player">🧑‍💼</div>
        <span className="cdm-name-tag cdm-name-tag--player">{playerName || 'You'}</span>
      </div>
    </div>
  )
}