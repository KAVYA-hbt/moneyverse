import './CompanionDialogueModal.css'

const SPEAKER_LABELS = {
  companion: null, // filled in by caller with the actual companion name
  npc: 'Citizen',
  mayor: 'Mayor',
  narrator: 'Story',
}

const SPEAKER_ICONS = {
  companion: '\ud83e\udd16',
  npc: '\ud83e\uddd1',
  mayor: '\ud83d\udc51',
  narrator: '\u2728',
}

/**
 * Full-width bar anchored to the bottom edge of the screen. Two portraits
 * overlap its top corners -- whoever is currently speaking (companion/npc/
 * mayor/narrator) on the left, the player's own avatar + name fixed on the
 * right -- so it reads as a real two-person conversation rather than one
 * character talking at an empty space. The text + any option buttons sit
 * centered between them.
 *
 * Also renders story-narrator content now (see checklist item #5) --
 * previously a completely separate top-of-screen overlay
 * (StoryNarratorOverlay), which meant two different-looking systems for
 * what the player experienced as "someone talking to me." narrative
 * (companion) takes priority if somehow both are active at once, which
 * shouldn't normally happen in practice but is handled defensively.
 */
export default function CompanionDialogueModal({ narrative, narrator, companionName, playerName }) {
  const usingNarrator = !narrative.isActive && narrator?.isActive
  if (!narrative.isActive && !usingNarrator) return null

  const speaker = usingNarrator ? 'narrator' : narrative.speaker
  const speakerLabel = speaker === 'companion' ? (companionName || 'Companion') : SPEAKER_LABELS[speaker]
  const currentLine = usingNarrator ? narrator.currentLine : narrative.currentLine
  const options = usingNarrator ? null : narrative.options
  const hasMoreLines = usingNarrator ? narrator.hasMoreLines : narrative.hasMoreLines
  const advance = usingNarrator ? narrator.advance : narrative.advance

  return (
    <div className="cdm-bar">
      <div className="cdm-portrait-col cdm-portrait-col--speaker">
        <div className={`cdm-portrait cdm-portrait--${speaker}`}>
          {SPEAKER_ICONS[speaker] || '\ud83d\udcac'}
        </div>
        <span className={`cdm-name-tag cdm-name-tag--${speaker}`}>{speakerLabel}</span>
      </div>

      <div className="cdm-text-col">
        <p className="cdm-line">{currentLine}</p>

        {options ? (
          <div className="cdm-options">
            {options.map((opt) => (
              <button key={opt.value} className="cdm-option-btn" onClick={() => narrative.selectOption(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <button className="cdm-continue-btn" onClick={advance}>
            {hasMoreLines ? 'Next' : 'Okay'}
          </button>
        )}
      </div>

      <div className="cdm-portrait-col cdm-portrait-col--player">
        <div className="cdm-portrait cdm-portrait--player">{'\ud83e\uddd1\u200d\ud83d\udcbc'}</div>
        <span className="cdm-name-tag cdm-name-tag--player">{playerName || 'You'}</span>
      </div>
    </div>
  )
}