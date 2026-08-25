// Floating, minimizable "onboarding assistant" widget -- replaces the old behavior of
// navigating the whole tab away to the onboarding URL (window.location.href), which pulled the
// player out of the game entirely. This keeps them in-world: the onboarding flow renders inside
// a phone-sized floating panel they can minimize back to a small bubble and restore anytime,
// same interaction model as a support-chat widget.
//
// NOTE ON IFRAMING: some sites send an X-Frame-Options/CSP header that refuses to render inside
// an <iframe> at all -- the panel will just show a blank/blocked frame for those. Per product
// decision the header only exposes minimize (no close/open-in-new-tab escape hatch), so make
// sure whatever URL is wired in via GamePage.jsx's ONBOARD_PLACEHOLDER_URL actually allows
// framing before shipping it, since there's no fallback control here if it doesn't.
import { useState } from 'react'

export default function OnboardingAssistantWidget({ url, t }) {
  const [minimized, setMinimized] = useState(false)

  if (minimized) {
    return (
      <button
        type="button"
        className="onboarding-widget-bubble"
        onClick={() => setMinimized(false)}
        aria-label={t('game.onboardingRestore')}
        title={t('game.onboardingRestore')}
      >
        🏦
      </button>
    )
  }

  return (
    <div className="onboarding-widget" role="dialog" aria-label={t('game.onboardingAssistantTitle')}>
      <div className="onboarding-widget-header">
        <span className="onboarding-widget-title">{t('game.onboardingAssistantTitle')}</span>
        <div className="onboarding-widget-header-actions">
          <button
            type="button"
            className="onboarding-widget-header-btn"
            onClick={() => setMinimized(true)}
            title={t('game.onboardingMinimize')}
            aria-label={t('game.onboardingMinimize')}
          >
            −
          </button>
        </div>
      </div>
      <div className="onboarding-widget-frame-wrap">
        <iframe
          src={url}
          title={t('game.onboardingAssistantTitle')}
          className="onboarding-widget-frame"
        />
      </div>
    </div>
  )
}
