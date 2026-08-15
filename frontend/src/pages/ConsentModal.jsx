import { useState } from 'react'
import './ConsentModal.css'

export default function ConsentModal({ onCancel, onAgree }) {
  const [readAgreement, setReadAgreement] = useState(false)
  const [consent, setConsent] = useState(false)

  const canAgree = readAgreement && consent

  return (
    <div className="consent">
      <div className="consent__backdrop" onClick={onCancel} />
      <div className="consent__modal">
        <p className="consent__eyebrow">Step 2 of 2</p>
        <h2 className="consent__title">Consent &amp; Data Usage Agreement</h2>

        <a
          className="consent__doc"
          href="/docs/questcraft_data_usage_agreement.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="consent__doc-icon">📄</div>
          <div>
            <p className="consent__doc-name">Moneyverse Data Usage Agreement</p>
            <p className="consent__doc-meta">PDF · 1 page · opens in a new tab</p>
          </div>
        </a>

        <label className="consent__check">
          <input
            type="checkbox"
            checked={readAgreement}
            onChange={(e) => setReadAgreement(e.target.checked)}
          />
          <span>I have read the Moneyverse Data Usage Agreement</span>
        </label>

        <label className="consent__check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>I consent to using my details for this demo experience</span>
        </label>

        <div className="consent__actions">
          <button className="consent__cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="consent__agree" disabled={!canAgree} onClick={onAgree}>
            Agree &amp; Start Game
          </button>
        </div>
      </div>
    </div>
  )
}