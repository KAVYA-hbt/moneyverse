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

export function getLevelInfo(completedCount) {
  const idx = Math.min(Math.floor(completedCount / 5), LEVELS.length - 1)
  return LEVELS[idx]
}
