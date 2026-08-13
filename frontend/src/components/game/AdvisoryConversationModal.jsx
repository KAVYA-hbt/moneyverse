import { useEffect, useRef } from 'react'
import './AdvisoryConversationModal.css'

const SPEAKER_META = {
  npc: { align: 'left', className: 'acm-bubble--npc' },
  robot: { align: 'left', className: 'acm-bubble--robot' },
  player: { align: 'right', className: 'acm-bubble--player' },
}

export default function AdvisoryConversationModal({ conversation, npcPortrait, playerPortrait }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation.messages])

  // Same second-layer defense as CompanionDialogueModal — refuse to
  // render if there's genuinely nothing in the chat log yet, instead of
  // showing an empty panel with a dangling Okay button.
  if (!conversation.isActive || conversation.messages.length === 0) return null

  return (
    <div className="acm-overlay">
      <div className="acm-panel">
        <div className="acm-header">
          <span className="acm-header-title">{conversation.npcName}</span>
          <button className="acm-close-btn" onClick={conversation.close}>✕</button>
        </div>

        <div className="acm-messages" ref={scrollRef}>
          {conversation.messages.map((msg) => {
            const meta = SPEAKER_META[msg.speaker] || SPEAKER_META.npc
            const isPlayer = msg.speaker === 'player'
            return (
              <div key={msg.id} className={`acm-row acm-row--${meta.align}`}>
                {!isPlayer && (
                  <div className={`acm-avatar ${msg.speaker === 'robot' ? 'acm-avatar--robot' : 'acm-avatar--npc'}`}>
                    {msg.speaker === 'robot' ? '🤖' : (npcPortrait ? <img src={npcPortrait} alt="" /> : '🧑')}
                  </div>
                )}
                <div className={`acm-bubble ${meta.className}`}>{msg.text}</div>
                {isPlayer && (
                  // Player's own messages carry their own avatar on the
                  // right, WhatsApp-style — matches how NPC/robot lines
                  // carry an avatar on the left, instead of the player's
                  // bubbles floating with no identity attached.
                  <div className="acm-avatar acm-avatar--player">
                    {playerPortrait ? <img src={playerPortrait} alt="" /> : '🙂'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="acm-prompt">
          {conversation.currentOptions && (
            <div className="acm-cards-row">
              {conversation.currentOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="acm-card"
                  onClick={() => conversation.selectOption(opt.value, opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {conversation.showConfirmCards && (
            <div className="acm-cards-row acm-cards-row--confirm">
              <button className="acm-card acm-card--yes" onClick={() => conversation.confirmChoice(true)}>
                ✅ Yes, do it
              </button>
              <button className="acm-card acm-card--no" onClick={() => conversation.confirmChoice(false)}>
                🤔 No, let me think
              </button>
              {/* Robot-help icon — always available during confirm, not
                  just on hesitation, per the dialogue redesign spec. */}
              <button
                className="acm-robot-help-btn"
                onClick={conversation.requestRobotHelp}
                aria-label="Ask the robot"
                title="Ask the robot"
              >
                🤖
              </button>
            </div>
          )}

          {conversation.showResolveContinue && (
            <button className="acm-continue-btn" onClick={conversation.advanceResolution}>
              Continue
            </button>
          )}

          {conversation.phase === 'done' && (
            <button className="acm-continue-btn acm-continue-btn--close" onClick={conversation.close}>
              Okay
            </button>
          )}
        </div>
      </div>
    </div>
  )
}