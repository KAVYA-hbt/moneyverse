import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import './ConsentModal.css'

export default function ConsentModal({ onCancel, onAgree }) {
  const { t } = useLanguage()
  const [readAgreement, setReadAgreement] = useState(false)
  const [consent, setConsent] = useState(false)

  const canAgree = readAgreement && consent

  return (
    <div className="consent">
      <div className="consent__backdrop" onClick={onCancel} />
      <div className="consent__modal">
        <p className="consent__eyebrow">{t('consent.step')}</p>
        <h2 className="consent__title">{t('consent.title')}</h2>

        <a
          className="consent__doc"
          href="/docs/questcraft_data_usage_agreement.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="consent__doc-icon">📄</div>
          <div>
            <p className="consent__doc-name">{t('consent.docName')}</p>
            <p className="consent__doc-meta">{t('consent.docMeta')}</p>
          </div>
        </a>

        <label className="consent__check">
          <input
            type="checkbox"
            checked={readAgreement}
            onChange={(e) => setReadAgreement(e.target.checked)}
          />
          <span>{t('consent.check1')}</span>
        </label>

        <label className="consent__check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{t('consent.check2')}</span>
        </label>

        <div className="consent__actions">
          <button className="consent__cancel" onClick={onCancel}>
            {t('consent.cancel')}
          </button>
          <button className="consent__agree" disabled={!canAgree} onClick={onAgree}>
            {t('consent.agree')}
          </button>
        </div>
      </div>
    </div>
  )
}