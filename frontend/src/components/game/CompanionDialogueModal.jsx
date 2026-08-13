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
  // Second layer of defense, in addition to the guard already in
  // useCompanionNarrative's play() — if isActive is somehow true with
  // no real line to show (e.g. an older cached build, or a future call
  // site that bypasses play()), refuse to render a bar with nothing in
  // it. This is exactly the "empty box with just an Okay button" bug —
  // closing here instead of showing it is strictly better than leaving
  // the player staring at a dead button with no text and no way to
  // understand what happened.
  if (!narrative.isActive || !narrative.currentLine || !narrative.currentLine.trim()) return null

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