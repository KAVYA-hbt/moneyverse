// The new per-level task structure — 5 tasks per level, all NPC-driven
// "help someone with a real decision" content instead of visiting fixed
// document/bank-counter buildings. Reuses the exact same quiz pipeline
// (generateQuizFromBackend + QuestQuizModal) as everything else in the
// game; this file only supplies WHAT topic/fallback content to use.
//
// Task shape per level:
//   L1: [companion, npc_help, recognition, minigame, capstone]  (5 — the
//       only level with the one-time companion + recognition slots)
//   L2-L5: [npc_help, npc_help, npc_help, minigame, capstone]   (5 each)
//
// Capstone reuses the level's own LAST existing quest building as its
// physical location (see GamePage.jsx) — no new 3D assets needed, just a
// bigger, higher-reward question posed there instead of the old fixed quiz.

export const LEVEL_ADVISORY_TOPICS = {
  1: [
    {
      topic: 'comparing loan offers by total interest, not just the rate',
      fallbackQuiz: {
        question:
          "I've got three loan offers — 9% for 3 years, 7% for 5 years, or 8% for 4 years. Which costs me the LEAST in total interest?",
        options: ['9% for 3 years', '7% for 5 years', '8% for 4 years', "They're all exactly the same"],
        correctIndex: 0,
      },
    },
    {
      topic: 'why a bank account and ID matter for daily life',
      fallbackQuiz: {
        question:
          "I keep all my savings in cash at home and don't have a bank account — is that actually a problem?",
        options: [
          'Yes — no safety, no interest, no way to receive digital payments',
          "No, cash is always safer than any bank",
          "Doesn't matter either way",
          'Only rich people need bank accounts',
        ],
        correctIndex: 0,
      },
    },
    {
      topic: 'basic monthly budgeting for a first salary',
      fallbackQuiz: {
        question:
          "I just got my first salary and want to spend it all on things I like this month — good idea?",
        options: [
          'Set aside savings first, then spend what remains',
          'Spend everything, savings can start next month',
          'Savings only matter after age 40',
          "There's no real difference either way",
        ],
        correctIndex: 0,
      },
    },
  ],
  2: [
    {
      topic: 'UPI safety — never sharing OTP or PIN even to "receive" money',
      fallbackQuiz: {
        question:
          "Someone messaged saying I'll receive ₹500 if I enter my UPI PIN on a link they sent. Should I do it?",
        options: [
          "No — PINs are only ever needed to SEND money, never to receive it",
          'Yes, if the message looks official',
          'Only if the amount is small',
          "It's fine as long as it's a bank's number",
        ],
        correctIndex: 0,
      },
    },
    {
      topic: 'choosing net banking over standing in line for simple transactions',
      fallbackQuiz: {
        question:
          "I need to check my balance and transfer money to a friend — worth setting up net/mobile banking for this?",
        options: [
          'Yes — both take seconds online vs a branch visit',
          'No, branch visits are always faster',
          'Only for large amounts',
          'Net banking is riskier than visiting in person',
        ],
        correctIndex: 0,
      },
    },
    {
      topic: 'reading a bank passbook/statement to catch an error early',
      fallbackQuiz: {
        question:
          "I never check my passbook or statements since I trust the bank completely — is that risky?",
        options: [
          'Yes — checking regularly is how you catch errors or fraud early',
          'No, banks never make mistakes',
          'Only needs checking once a year',
          "Statements are just for tax purposes"
        ],
        correctIndex: 0,
      },
    },
  ],
  3: [
    {
      topic: 'fixed deposit vs recurring deposit for a short-term goal',
      fallbackQuiz: {
        question:
          "I have a lump sum I want to save for 1 year — should I put it in a Fixed Deposit or start a Recurring Deposit?",
        options: [
          'Fixed Deposit — it suits a lump sum you already have',
          'Recurring Deposit — always better for any goal',
          "Doesn't matter, they're identical",
          'Neither, keep it in cash at home',
        ],
        correctIndex: 0,
      },
    },
    {
      topic: 'why a good credit score matters before applying for a loan',
      fallbackQuiz: {
        question:
          "I've never checked my credit score and I'm about to apply for a loan — should I check it first?",
        options: [
          'Yes — a low score can mean rejection or a much higher interest rate',
          'No, credit scores only matter for credit cards',
          "Scores don't affect loan approval at all",
          'Only businesses need to worry about credit scores',
        ],
        correctIndex: 0,
      },
    },
    {
      topic: 'health insurance basics before a medical emergency happens',
      fallbackQuiz: {
        question:
          "I'm young and healthy, so health insurance feels unnecessary right now — fair thinking?",
        options: [
          "No — one emergency can wipe out savings; insurance is cheaper bought early",
          'Yes, insurance is only worth it after 50',
          'Health insurance is optional if you eat well',
          'Insurance only matters if you have a family',
        ],
        correctIndex: 0,
      },
    },
  ],
  4: [
    {
      topic: 'never sharing OTP with anyone, including "bank staff" callers',
      fallbackQuiz: {
        question:
          "Someone called claiming to be from my bank, said there's a problem, and asked for my OTP to 'verify' me. What now?",
        options: [
          'Hang up — real banks never ask for your OTP over a call',
          'Give it, since they said they were from the bank',
          'Only share the first 3 digits',
          "It's fine if they already knew my account number",
        ],
        correctIndex: 0,
      },
    },
    {
      topic: 'recognizing a phishing link disguised as a bank message',
      fallbackQuiz: {
        question:
          "I got an SMS with a link saying my account will be blocked unless I 'verify' immediately by clicking it. Click it?",
        options: [
          "No — this is a classic phishing pattern; contact the bank directly instead",
          'Yes, urgency means it must be real',
          'Only click if the link has "bank" in the name',
          'Forward it to family and then click it',
        ],
        correctIndex: 0,
      },
    },
    {
      topic: 'ATM safety — covering the keypad and checking for skimming devices',
      fallbackQuiz: {
        question:
          "At the ATM, does it actually matter if I cover the keypad while entering my PIN?",
        options: [
          'Yes — it blocks hidden cameras and shoulder-surfing from stealing your PIN',
          'No, ATMs are fully secure on their own',
          'Only matters at night',
          "Covering it looks suspicious, better not to",
        ],
        correctIndex: 0,
      },
    },
  ],
  5: [
    {
      topic: 'starting mutual fund SIPs early vs waiting for a "better time"',
      fallbackQuiz: {
        question:
          "I keep waiting for the 'perfect time' to start investing in mutual funds — smart strategy?",
        options: [
          "No — starting early and staying consistent (SIP) usually beats timing the market",
          'Yes, timing the market perfectly is the best approach',
          "Mutual funds are only for people near retirement",
          "There's no benefit to starting early",
        ],
        correctIndex: 0,
      },
    },
    {
      topic: 'why retirement planning (like NPS) should start well before retirement age',
      fallbackQuiz: {
        question:
          "I'm in my late 20s — isn't retirement planning something to worry about after 40?",
        options: [
          'No — starting early means compounding does most of the work for you',
          'Yes, retirement planning before 40 is pointless',
          'Only government employees need retirement plans',
          'Retirement savings should wait until the loan is paid off',
        ],
        correctIndex: 0,
      },
    },
    {
      topic: 'paying credit card bills in full vs only the minimum due',
      fallbackQuiz: {
        question:
          "I only pay the 'minimum due' on my credit card each month to save cash — is that a good habit?",
        options: [
          "No — the remaining balance accrues high interest, it's an expensive habit",
          'Yes, minimum due is designed to be the smart choice',
          "Doesn't matter as long as you pay something",
          'Minimum due has no interest attached',
        ],
        correctIndex: 0,
      },
    },
  ],
}

export const LEVEL_CAPSTONE_QUESTS = {
  1: {
    label: 'Municipality Office',
    reward: 30,
    fallbackQuiz: {
      question:
        "The Municipality Office is switching new residents to fully digital ID verification — what's the single biggest reason that's a good move for someone new to the city?",
      options: [
        "Faster, trackable proof of identity without repeated paperwork",
        'It removes the need for any ID at all',
        "It's mainly to reduce office decoration costs",
        'Digital records expire faster than paper ones',
      ],
      correctIndex: 0,
    },
  },
  2: {
    label: 'Net Banking Center',
    reward: 35,
    fallbackQuiz: {
      question:
        "A neighbor wants to move fully to digital banking but is worried it's 'less safe' than visiting a branch. What's the most accurate thing to tell them?",
      options: [
        "It's safe with basic precautions (strong PIN, no OTP sharing) — often safer than carrying cash",
        'Digital banking has no real security at all',
        'Branches are always 100% safer than any app',
        'Digital banking is only for young people',
      ],
      correctIndex: 0,
    },
  },
  3: {
    label: 'FD Counter',
    reward: 40,
    fallbackQuiz: {
      question:
        "Someone with ₹2 lakh savings and no debt asks whether to put it all in one Fixed Deposit or split it across FD, an emergency fund, and some mutual funds. Best general advice?",
      options: [
        'Split it — emergency fund first, then diversify rather than one single option',
        'Put it all in one FD, simplicity wins',
        'Spend it, saving is overrated',
        'FDs are outdated and should never be used',
      ],
      correctIndex: 0,
    },
  },
  4: {
    label: 'Cyber Cell',
    reward: 45,
    fallbackQuiz: {
      question:
        "A resident already clicked a suspicious link and entered their UPI PIN before realizing it was a scam. What should they do FIRST?",
      options: [
        'Immediately contact their bank to block/freeze the account and change credentials',
        'Wait a day to see if anything happens',
        'Just delete the message and move on',
        'Share the PIN again to "test" if it was really a scam',
      ],
      correctIndex: 0,
    },
  },
  5: {
    label: 'Financial Planning Office',
    reward: 50,
    fallbackQuiz: {
      question:
        "A resident in their 30s asks how to prioritize: paying off a small loan early, starting retirement savings, or increasing mutual fund SIPs. What's the most balanced approach?",
      options: [
        'Keep the loan on schedule if the rate is low, and start retirement + SIPs now — time matters most',
        'Pay off every loan completely before saving anything',
        'Ignore retirement savings until the 40s',
        'Only invest, skip loans and retirement entirely',
      ],
      correctIndex: 0,
    },
  },
}

export function pickAdvisoryTopicForLevel(level) {
  const pool = LEVEL_ADVISORY_TOPICS[level] || LEVEL_ADVISORY_TOPICS[1]
  return pool[Math.floor(Math.random() * pool.length)]
}