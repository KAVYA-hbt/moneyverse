import { useEffect, useRef } from 'react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import './AdvisoryConversationModal.css'

const SPEAKER_META = {
  npc: { align: 'left', className: 'acm-bubble--npc' },
  player: { align: 'right', className: 'acm-bubble--player' },
}

export default function AdvisoryConversationModal({ conversation, npcPortrait, playerPortrait }) {
  const { t } = useLanguage()
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation.messages])

  if (!conversation.isActive || conversation.messages.length === 0) return null

  return (
    <div className="acm-overlay">
      <div className="acm-panel">
        {/* Robot help -- sits OUTSIDE/above the chat panel entirely, not
            as a message in the log. Only rendered when this phase/path
            actually has a hint written for it. */}
        {conversation.robotHelpAvailable && (
          <div className="acm-robot-dock">
            <button
              className="acm-robot-help-btn"
              onClick={conversation.requestRobotHelp}
              aria-label={t('advisory.needHelp')}
              title={t('advisory.needHelp')}
            >
              🤖 <span>{t('advisory.needHelp')}</span>
            </button>

            {conversation.robotHintVisible && (
              <div className="acm-robot-hint-popup">
                <button className="acm-robot-hint-close" onClick={conversation.dismissRobotHint} aria-label={t('badge.close')}>
                  ✕
                </button>
                <p>{conversation.robotHintText}</p>
              </div>
            )}
          </div>
        )}

        {/* The takeaway lesson -- fades in beside the conversation once
            the resolution wraps up, never AS a chat bubble the player has
            to tap past. It doesn't cost a turn: the real mid-resolution
            choices are already tappable the moment this appears. */}
        {conversation.takeawayVisible && conversation.takeawayText && (
          <div className="acm-takeaway-dock">
            {conversation.takeawayText}
          </div>
        )}

        <div className="acm-header">
          <span className="acm-header-title">{conversation.npcName}</span>
          <button className="acm-close-btn" onClick={conversation.close}>✕</button>
        </div>

        <div className="acm-messages" ref={scrollRef}>
          {conversation.messages.map((msg) => {
            // A "time_skip" entry (the "...a few days later" marker -- see
            // useAdvisoryConversation.js's confirmChoice) is a narrator
            // beat, not something either party said -- rendered as its
            // own centered divider instead of a chat bubble with an avatar.
            if (msg.speaker === 'time_skip') {
              return (
                <div key={msg.id} className="acm-time-skip">
                  <span>{msg.text}</span>
                </div>
              )
            }

            const meta = SPEAKER_META[msg.speaker] || SPEAKER_META.npc
            const isPlayer = msg.speaker === 'player'

            return (
              <div key={msg.id} className={`acm-row acm-row--${meta.align}`}>
                {!isPlayer && (
                  <div className="acm-avatar acm-avatar--npc">
                    {npcPortrait ? <img src={npcPortrait} alt="" /> : '🧑'}
                  </div>
                )}
                <div className={`acm-bubble ${meta.className}`}>{msg.text}</div>
                {isPlayer && (
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
            <div className="acm-cards-row">
              <button className="acm-card acm-card--yes" onClick={() => conversation.confirmChoice(true)}>
                {t('advisory.confirmYes')}
              </button>
              <button className="acm-card acm-card--no" onClick={() => conversation.confirmChoice(false)}>
                {t('advisory.confirmNo')}
              </button>
            </div>
          )}

          {/* Real tap-choice reaction chips -- replaces the old passive
              "Continue" button between resolution lines. Both options
              advance the story; the player always has an actual pick. */}
          {conversation.resolutionReactionOptions && (
            <div className="acm-cards-row">
              {conversation.resolutionReactionOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="acm-card"
                  onClick={() => conversation.selectResolutionReaction(opt.value, opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {conversation.midResolutionOptions && (
            <div className="acm-cards-row">
              {conversation.midResolutionOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="acm-card"
                  onClick={() => conversation.selectMidResolutionOption(opt.value, opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {conversation.goodbyeOptions && (
            <div className="acm-cards-row">
              {conversation.goodbyeOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="acm-card"
                  onClick={() => conversation.selectGoodbyeOption(opt.value, opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* The one beat in this whole conversation with nothing to
              actually decide -- just time passing -- so it's a single
              continue tap rather than two option chips. Still the
              player's own action moving things forward, never a timer. */}
          {conversation.phase === 'time_skip' && (
            <button className="acm-continue-btn" onClick={conversation.continueAfterPurchase}>
              {t('advisory.tapToContinue')}
            </button>
          )}

          {conversation.phase === 'done' && (
            <button className="acm-continue-btn acm-continue-btn--close" onClick={conversation.close}>
              {t('advisory.okay')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}