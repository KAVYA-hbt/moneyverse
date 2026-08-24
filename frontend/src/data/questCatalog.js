import { resolveLocalized } from '../i18n/dataLocalization.js'

// Single source of truth for the 5-level, 25-quest curriculum.
//
// Design notes / assumptions (flag these to the team if they need adjusting):
// - Only Level 1 differs by scenario (employee gets "Workplace" / salary_slip
//   in place of the student's "Local Store"), since Levels 2-5 cover general
//   banking/financial literacy that applies to both audiences equally.
// - Levels 2-5 quest buildings are NOT given dedicated 3D models in the
//   backend (backend/app/city_builder/generate_layout.py only reserves fixed
//   slots for bank/aadhaar/pan/salary_slip). The other 21 quests reuse
//   whatever generic building the seeded shuffle assigns them, the same way
//   "store" and "hospital" already worked before this catalog existed.
//   Extending the backend to give each of the 25 quests its own matching
//   model would require reworking generate_layout.py's fixed reserved-row
//   placement logic - flagged as a possible follow-up, not done here.
// - "topic" is sent to the backend as quest_context.topic so the LLM has an
//   explicit subject to write questions about, instead of guessing from the
//   quest id slug (see the updated SYSTEM_PROMPT in main.py).

export const LEVELS = [
  { level: 1, title: 'Newcomer', difficulty: 'easy' },
  { level: 2, title: 'Explorer', difficulty: 'easy' },
  { level: 3, title: 'Achiever', difficulty: 'medium' },
  { level: 4, title: 'Specialist', difficulty: 'medium' },
  { level: 5, title: 'SBI Master', difficulty: 'hard' },
]

const REWARD_BY_LEVEL = { 1: 20, 2: 25, 3: 30, 4: 35, 5: 40 }

// id -> { label, topic, level }. Covers every quest id used across both
// scenario chains below (26 unique ids: 25 shared + the 1 that differs
// between scenarios at Level 1).
export const QUEST_META = {
  // ---- Level 1: Foundations ----
  aadhaar: { level: 1, label: 'Municipality Office', topic: 'Identity documents (Aadhaar) & municipal registration' },
  pan: { level: 1, label: 'PAN Seva Kendra', topic: 'PAN card basics and why it is needed' },
  bank: { level: 1, label: 'SBI Bank Branch', topic: 'Bank account types (savings vs current)' },
  store: { level: 1, label: 'Local Store', topic: 'Everyday budgeting and smart shopping' },
  hospital: { level: 1, label: 'City Hospital', topic: 'Health insurance basics' },
  salary_slip: { level: 1, label: 'Workplace', topic: 'Salary slips and Form 16 as income proof' },

  // ---- Level 2: Everyday Banking ----
  atm_pin: { level: 2, label: 'ATM Kiosk', topic: 'ATM PIN safety and withdrawals' },
  upi_payment: { level: 2, label: 'UPI Payment Counter', topic: 'UPI payments and QR codes' },
  passbook: { level: 2, label: 'Passbook Counter', topic: 'Passbooks and account statements' },
  cheque_book: { level: 2, label: 'Cheque Book Desk', topic: 'Cheque usage and safety' },
  net_banking: { level: 2, label: 'Net Banking Center', topic: 'Internet and mobile banking setup' },

  // ---- Level 3: Saving & Credit ----
  fixed_deposit: { level: 3, label: 'FD Counter', topic: 'Fixed deposits' },
  recurring_deposit: { level: 3, label: 'RD Counter', topic: 'Recurring deposits' },
  credit_score: { level: 3, label: 'Credit Bureau Office', topic: 'Credit score (CIBIL) basics' },
  loan_basics: { level: 3, label: 'Loan Office', topic: 'Loan basics and interest rates' },
  insurance: { level: 3, label: 'Insurance Office', topic: 'Insurance basics beyond health cover' },

  // ---- Level 4: Digital Safety ----
  otp_safety: { level: 4, label: 'Security Desk', topic: 'OTP safety' },
  phishing_awareness: { level: 4, label: 'Cyber Cell', topic: 'Phishing and scam awareness' },
  upi_fraud: { level: 4, label: 'Fraud Helpdesk', topic: 'UPI fraud prevention' },
  mobile_banking: { level: 4, label: 'Mobile Banking Kiosk', topic: 'Mobile banking app safety' },
  atm_safety: { level: 4, label: 'ATM Safety Point', topic: 'ATM safety practices' },

  // ---- Level 5: Advanced Literacy ----
  tax_filing: { level: 5, label: 'Tax Office', topic: 'Income tax filing basics' },
  mutual_funds: { level: 5, label: 'Investment Desk', topic: 'Mutual funds basics' },
  retirement_planning: { level: 5, label: 'Pension Office', topic: 'Retirement planning (NPS)' },
  credit_card_usage: { level: 5, label: 'Credit Card Center', topic: 'Credit card usage and billing' },
  budgeting: { level: 5, label: 'Financial Planning Office', topic: 'Personal budgeting' },
}

const SHARED_LEVELS_2_TO_5 = [
  'atm_pin', 'upi_payment', 'passbook', 'cheque_book', 'net_banking',
  'fixed_deposit', 'recurring_deposit', 'credit_score', 'loan_basics', 'insurance',
  'otp_safety', 'phishing_awareness', 'upi_fraud', 'mobile_banking', 'atm_safety',
  'tax_filing', 'mutual_funds', 'retirement_planning', 'credit_card_usage', 'budgeting',
]

// Ordered 25-quest chain per scenario. Order = unlock order (linear).
export const SCENARIO_CHAINS = {
  student: ['aadhaar', 'pan', 'bank', 'store', 'hospital', ...SHARED_LEVELS_2_TO_5],
  employee: ['aadhaar', 'pan', 'salary_slip', 'bank', 'store', ...SHARED_LEVELS_2_TO_5],
}

export const QUEST_LABELS = Object.fromEntries(
  Object.entries(QUEST_META).map(([id, meta]) => [id, meta.label])
)

export const QUEST_REWARDS = Object.fromEntries(
  Object.entries(QUEST_META).map(([id, meta]) => [
    id,
    id === 'bank' ? 100 : (REWARD_BY_LEVEL[meta.level] || 20),
  ])
)

export function getLevelInfo(completedCount, language = 'en') {
  const idx = Math.min(Math.floor(completedCount / 5), LEVELS.length - 1)
  const info = LEVELS[idx]
  return { ...info, title: resolveLocalized(LEVEL_TITLES_BY_LEVEL, LEVEL_TITLE_TRANSLATIONS, info.level, language) }
}

// --- Localization overlays -- only `label` (quest building names) and
// level `title`s are ever translated here; `topic` is sent to the backend
// as LLM context (see SYSTEM_PROMPT in main.py) and is never shown to the
// player, so it deliberately stays in English in every language. ---

const LEVEL_TITLES_BY_LEVEL = Object.fromEntries(LEVELS.map((l) => [l.level, l.title]))

const LEVEL_TITLES_HI = {
  1: 'नवागंतुक',
  2: 'खोजकर्ता',
  3: 'उपलब्धिकर्ता',
  4: 'विशेषज्ञ',
  5: 'SBI मास्टर',
}
const LEVEL_TITLES_TA = {
  1: 'புதியவர்',
  2: 'ஆய்வாளர்',
  3: 'சாதனையாளர்',
  4: 'நிபுணர்',
  5: 'SBI மாஸ்டர்',
}
const LEVEL_TITLE_TRANSLATIONS = { hi: LEVEL_TITLES_HI, ta: LEVEL_TITLES_TA }

const QUEST_LABELS_HI = {
  aadhaar: 'नगरपालिका कार्यालय',
  pan: 'PAN सेवा केंद्र',
  bank: 'SBI बैंक शाखा',
  store: 'स्थानीय दुकान',
  hospital: 'शहर अस्पताल',
  salary_slip: 'कार्यस्थल',
  atm_pin: 'ATM कियोस्क',
  upi_payment: 'UPI भुगतान काउंटर',
  passbook: 'पासबुक काउंटर',
  cheque_book: 'चेक बुक डेस्क',
  net_banking: 'नेट बैंकिंग केंद्र',
  fixed_deposit: 'FD काउंटर',
  recurring_deposit: 'RD काउंटर',
  credit_score: 'क्रेडिट ब्यूरो कार्यालय',
  loan_basics: 'ऋण कार्यालय',
  insurance: 'बीमा कार्यालय',
  otp_safety: 'सुरक्षा डेस्क',
  phishing_awareness: 'साइबर सेल',
  upi_fraud: 'धोखाधड़ी हेल्पडेस्क',
  mobile_banking: 'मोबाइल बैंकिंग कियोस्क',
  atm_safety: 'ATM सुरक्षा केंद्र',
  tax_filing: 'कर कार्यालय',
  mutual_funds: 'निवेश डेस्क',
  retirement_planning: 'पेंशन कार्यालय',
  credit_card_usage: 'क्रेडिट कार्ड केंद्र',
  budgeting: 'वित्तीय योजना कार्यालय',
}
const QUEST_LABELS_TA = {
  aadhaar: 'நகராட்சி அலுவலகம்',
  pan: 'PAN சேவை மையம்',
  bank: 'SBI வங்கி கிளை',
  store: 'உள்ளூர் கடை',
  hospital: 'நகர மருத்துவமனை',
  salary_slip: 'பணியிடம்',
  atm_pin: 'ATM கியோஸ்க்',
  upi_payment: 'UPI கட்டண கவுண்டர்',
  passbook: 'பாஸ்புக் கவுண்டர்',
  cheque_book: 'செக் புத்தக டெஸ்க்',
  net_banking: 'நெட் பேங்கிங் மையம்',
  fixed_deposit: 'FD கவுண்டர்',
  recurring_deposit: 'RD கவுண்டர்',
  credit_score: 'கிரெடிட் பீரோ அலுவலகம்',
  loan_basics: 'கடன் அலுவலகம்',
  insurance: 'காப்பீட்டு அலுவலகம்',
  otp_safety: 'பாதுகாப்பு டெஸ்க்',
  phishing_awareness: 'சைபர் செல்',
  upi_fraud: 'மோசடி ஹெல்ப்டெஸ்க்',
  mobile_banking: 'மொபைல் பேங்கிங் கியோஸ்க்',
  atm_safety: 'ATM பாதுகாப்பு மையம்',
  tax_filing: 'வரி அலுவலகம்',
  mutual_funds: 'முதலீட்டு டெஸ்க்',
  retirement_planning: 'ஓய்வூதிய அலுவலகம்',
  credit_card_usage: 'கிரெடிட் கார்டு மையம்',
  budgeting: 'நிதி திட்டமிடல் அலுவலகம்',
}

export function getQuestLabels(language = 'en') {
  if (language === 'en') return QUEST_LABELS
  const overlay = language === 'hi' ? QUEST_LABELS_HI : language === 'ta' ? QUEST_LABELS_TA : null
  if (!overlay) return QUEST_LABELS
  return Object.fromEntries(
    Object.keys(QUEST_LABELS).map((id) => [id, overlay[id] || QUEST_LABELS[id]])
  )
}
