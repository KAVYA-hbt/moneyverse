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

// Hindi/Tamil overlays -- see dataLocalization.js. `topic` is backend LLM
// context (never shown to the player) and is deliberately left untouched;
// only `fallbackQuiz.question`/`options` (and capstone `label`, matching
// questCatalog's building-name translations) are ever localized. Arrays
// are index-aligned 1:1 with LEVEL_ADVISORY_TOPICS so a translated pool
// can be merged entry-by-entry without touching `topic`/`correctIndex`.
const LEVEL_ADVISORY_TOPICS_HI = {
  1: [
    { fallbackQuiz: {
      question: 'मेरे पास तीन ऋण प्रस्ताव हैं — 3 साल के लिए 9%, 5 साल के लिए 7%, या 4 साल के लिए 8%। कुल ब्याज में मुझे सबसे कम किसमें पड़ेगा?',
      options: ['3 साल के लिए 9%', '5 साल के लिए 7%', '4 साल के लिए 8%', 'सभी बिल्कुल बराबर हैं'],
    } },
    { fallbackQuiz: {
      question: 'मैं अपनी सारी बचत घर पर नकद रखता/रखती हूं और मेरे पास बैंक खाता नहीं है — क्या यह वाकई एक समस्या है?',
      options: ['हां — कोई सुरक्षा नहीं, कोई ब्याज नहीं, डिजिटल भुगतान पाने का कोई तरीका नहीं', 'नहीं, नकद हमेशा किसी भी बैंक से ज़्यादा सुरक्षित है', 'दोनों में कोई फर्क नहीं पड़ता', 'सिर्फ अमीर लोगों को बैंक खाते चाहिए'],
    } },
    { fallbackQuiz: {
      question: 'मुझे अभी पहली सैलरी मिली है और मैं इस महीने अपनी पसंद की चीज़ों पर सब कुछ खर्च करना चाहता/चाहती हूं — क्या यह अच्छा विचार है?',
      options: ['पहले बचत अलग रखें, फिर बाकी बचा पैसा खर्च करें', 'सब कुछ खर्च करें, बचत अगले महीने से शुरू हो सकती है', 'बचत सिर्फ 40 की उम्र के बाद मायने रखती है', 'दोनों में कोई असली फर्क नहीं है'],
    } },
  ],
  2: [
    { fallbackQuiz: {
      question: 'किसी ने मैसेज किया कि अगर मैं उनके भेजे लिंक पर अपना UPI PIN डालूं तो मुझे ₹500 मिलेंगे। क्या मुझे यह करना चाहिए?',
      options: ['नहीं — PIN सिर्फ पैसे भेजने के लिए चाहिए होता है, पाने के लिए कभी नहीं', 'हां, अगर मैसेज असली जैसा लगे', 'सिर्फ तभी अगर रकम छोटी हो', 'ठीक है अगर यह किसी बैंक के नंबर से आया हो'],
    } },
    { fallbackQuiz: {
      question: 'मुझे अपना बैलेंस चेक करना है और दोस्त को पैसे भेजने हैं — क्या इसके लिए नेट/मोबाइल बैंकिंग सेट अप करना सही रहेगा?',
      options: ['हां — शाखा जाने के मुकाबले दोनों काम ऑनलाइन सेकंडों में हो जाते हैं', 'नहीं, शाखा जाना हमेशा तेज़ है', 'सिर्फ बड़ी रकम के लिए', 'नेट बैंकिंग खुद जाने से ज़्यादा जोखिम भरी है'],
    } },
    { fallbackQuiz: {
      question: 'मैं कभी अपनी पासबुक या स्टेटमेंट चेक नहीं करता/करती क्योंकि मुझे बैंक पर पूरा भरोसा है — क्या यह जोखिम भरा है?',
      options: ['हां — नियमित रूप से चेक करना ही गलती या धोखाधड़ी जल्दी पकड़ने का तरीका है', 'नहीं, बैंक कभी गलती नहीं करते', 'साल में एक बार चेक करना काफी है', 'स्टेटमेंट सिर्फ टैक्स के लिए होते हैं'],
    } },
  ],
  3: [
    { fallbackQuiz: {
      question: 'मेरे पास एक साल के लिए बचाने को एकमुश्त रकम है — क्या मुझे फिक्स्ड डिपॉज़िट में डालनी चाहिए या रिकरिंग डिपॉज़िट शुरू करनी चाहिए?',
      options: ['फिक्स्ड डिपॉज़िट — यह पहले से मौजूद एकमुश्त रकम के लिए सही है', 'रिकरिंग डिपॉज़िट — हर लक्ष्य के लिए हमेशा बेहतर', 'फर्क नहीं पड़ता, दोनों एक जैसे हैं', 'दोनों नहीं, घर पर नकद रखें'],
    } },
    { fallbackQuiz: {
      question: 'मैंने कभी अपना क्रेडिट स्कोर चेक नहीं किया और अब मैं ऋण के लिए आवेदन करने वाला/वाली हूं — क्या मुझे पहले इसे चेक करना चाहिए?',
      options: ['हां — कम स्कोर से अस्वीकृति या बहुत ऊंची ब्याज दर मिल सकती है', 'नहीं, क्रेडिट स्कोर सिर्फ क्रेडिट कार्ड के लिए मायने रखता है', 'स्कोर ऋण स्वीकृति को बिल्कुल प्रभावित नहीं करता', 'सिर्फ व्यवसायों को क्रेडिट स्कोर की चिंता करनी चाहिए'],
    } },
    { fallbackQuiz: {
      question: 'मैं जवान और स्वस्थ हूं, इसलिए स्वास्थ्य बीमा अभी ज़रूरी नहीं लगता — क्या यह सोच सही है?',
      options: ['नहीं — एक आपातकाल पूरी बचत खत्म कर सकता है; बीमा जल्दी लेना सस्ता पड़ता है', 'हां, बीमा सिर्फ 50 के बाद काम का है', 'अच्छा खाने पर स्वास्थ्य बीमा वैकल्पिक है', 'बीमा सिर्फ तभी मायने रखता है जब परिवार हो'],
    } },
  ],
  4: [
    { fallbackQuiz: {
      question: "किसी ने कॉल कर के कहा कि वे बैंक से हैं, बताया कि कोई समस्या है, और मुझे 'सत्यापित' करने के लिए OTP मांगा। अब क्या करूं?",
      options: ['कॉल काट दें — असली बैंक कभी कॉल पर OTP नहीं मांगते', 'दे दें, क्योंकि उन्होंने कहा कि वे बैंक से हैं', 'सिर्फ पहले 3 अंक बताएं', 'ठीक है अगर उन्हें पहले से मेरा अकाउंट नंबर पता हो'],
    } },
    { fallbackQuiz: {
      question: "मुझे एक SMS मिला जिसमें एक लिंक था और कहा गया कि अगर मैंने तुरंत क्लिक करके 'सत्यापित' नहीं किया तो मेरा अकाउंट ब्लॉक हो जाएगा। क्या क्लिक करूं?",
      options: ['नहीं — यह एक क्लासिक फिशिंग तरीका है; इसके बजाय सीधे बैंक से संपर्क करें', 'हां, जल्दी बताने का मतलब है यह असली होगा', 'सिर्फ तभी क्लिक करें अगर लिंक के नाम में "bank" हो', 'इसे परिवार को फॉरवर्ड करें और फिर क्लिक करें'],
    } },
    { fallbackQuiz: {
      question: 'ATM पर, क्या PIN डालते समय कीपैड को ढकना वाकई मायने रखता है?',
      options: ['हां — यह छुपे हुए कैमरों और झांकने से PIN चोरी होने से रोकता है', 'नहीं, ATM खुद पूरी तरह सुरक्षित होते हैं', 'सिर्फ रात में मायने रखता है', 'ढकना संदिग्ध लगता है, बेहतर है न करें'],
    } },
  ],
  5: [
    { fallbackQuiz: {
      question: "मैं म्यूचुअल फंड में निवेश शुरू करने के लिए 'सही समय' का इंतज़ार करता/करती रहता/रहती हूं — क्या यह समझदारी है?",
      options: ['नहीं — जल्दी शुरू करना और लगातार बने रहना (SIP) आमतौर पर बाज़ार का समय भांपने से बेहतर होता है', 'हां, बाज़ार का सही समय भांपना सबसे अच्छा तरीका है', 'म्यूचुअल फंड सिर्फ रिटायरमेंट के करीब वालों के लिए हैं', 'जल्दी शुरू करने का कोई फायदा नहीं है'],
    } },
    { fallbackQuiz: {
      question: 'मैं 20 के दशक के आखिर में हूं — क्या रिटायरमेंट की योजना 40 के बाद की चिंता नहीं है?',
      options: ['नहीं — जल्दी शुरू करने से चक्रवृद्धि ज़्यादातर काम खुद कर देती है', 'हां, 40 से पहले रिटायरमेंट प्लानिंग बेकार है', 'सिर्फ सरकारी कर्मचारियों को रिटायरमेंट प्लान चाहिए', 'रिटायरमेंट बचत ऋण चुकने तक रुकनी चाहिए'],
    } },
    { fallbackQuiz: {
      question: "मैं पैसे बचाने के लिए हर महीने अपने क्रेडिट कार्ड पर सिर्फ 'न्यूनतम देय राशि' भरता/भरती हूं — क्या यह अच्छी आदत है?",
      options: ['नहीं — बाकी बची राशि पर ऊंचा ब्याज लगता रहता है, यह महंगी आदत है', 'हां, न्यूनतम देय राशि ही समझदारी भरा विकल्प है', 'फर्क नहीं पड़ता जब तक कुछ भर रहे हैं', 'न्यूनतम देय राशि पर कोई ब्याज नहीं लगता'],
    } },
  ],
}

const LEVEL_CAPSTONE_QUESTS_HI = {
  1: { label: 'नगरपालिका कार्यालय', fallbackQuiz: {
    question: 'नगरपालिका कार्यालय नए निवासियों को पूरी तरह डिजिटल पहचान सत्यापन में बदल रहा है — शहर में नए किसी व्यक्ति के लिए यह अच्छा कदम होने का सबसे बड़ा कारण क्या है?',
    options: ['बार-बार कागज़ी काम के बिना तेज़, ट्रैक करने योग्य पहचान प्रमाण', 'इससे किसी भी पहचान की ज़रूरत ही खत्म हो जाती है', 'यह मुख्य रूप से ऑफिस की सजावट का खर्च कम करने के लिए है', 'डिजिटल रिकॉर्ड कागज़ी रिकॉर्ड से जल्दी खत्म हो जाते हैं'],
  } },
  2: { label: 'नेट बैंकिंग केंद्र', fallbackQuiz: {
    question: "एक पड़ोसी पूरी तरह डिजिटल बैंकिंग अपनाना चाहता है पर चिंतित है कि यह शाखा जाने से 'कम सुरक्षित' है। उन्हें सबसे सटीक बात क्या बतानी चाहिए?",
    options: ['बुनियादी सावधानियों (मज़बूत PIN, OTP साझा न करना) के साथ यह सुरक्षित है — अक्सर नकद रखने से भी ज़्यादा सुरक्षित', 'डिजिटल बैंकिंग में कोई असली सुरक्षा है ही नहीं', 'शाखा हमेशा किसी भी ऐप से 100% ज़्यादा सुरक्षित होती है', 'डिजिटल बैंकिंग सिर्फ युवाओं के लिए है'],
  } },
  3: { label: 'FD काउंटर', fallbackQuiz: {
    question: '₹2 लाख की बचत और कोई कर्ज़ न रखने वाला व्यक्ति पूछता है कि क्या पूरा पैसा एक फिक्स्ड डिपॉज़िट में डालें या FD, एक इमरजेंसी फंड, और कुछ म्यूचुअल फंड में बांटें। सबसे अच्छी सामान्य सलाह?',
    options: ['बांटें — पहले इमरजेंसी फंड, फिर एक ही विकल्प की बजाय विविधता लाएं', 'सब कुछ एक ही FD में डालें, सादगी जीतती है', 'खर्च कर दें, बचत बहुत ज़्यादा मानी जाती है', 'FD पुराने ज़माने की हैं और कभी इस्तेमाल नहीं करनी चाहिए'],
  } },
  4: { label: 'साइबर सेल', fallbackQuiz: {
    question: 'एक निवासी ने पहले ही एक संदिग्ध लिंक पर क्लिक कर अपना UPI PIN डाल दिया, और बाद में पता चला कि यह घोटाला था। उन्हें सबसे पहले क्या करना चाहिए?',
    options: ['तुरंत अपने बैंक से संपर्क कर अकाउंट ब्लॉक/फ्रीज़ करवाएं और क्रेडेंशियल बदलें', 'एक दिन इंतज़ार करें कि कुछ होता है या नहीं', 'बस मैसेज डिलीट करके आगे बढ़ जाएं', 'यह जांचने के लिए कि सच में घोटाला था या नहीं, PIN फिर से शेयर करें'],
  } },
  5: { label: 'वित्तीय योजना कार्यालय', fallbackQuiz: {
    question: '30 की उम्र के एक निवासी पूछते हैं कि प्राथमिकता कैसे तय करें: एक छोटा ऋण जल्दी चुकाना, रिटायरमेंट बचत शुरू करना, या म्यूचुअल फंड SIP बढ़ाना। सबसे संतुलित तरीका क्या है?',
    options: ['अगर दर कम है तो ऋण को उसकी तय समयसीमा पर चलने दें, और अभी रिटायरमेंट + SIP शुरू करें — समय सबसे ज़्यादा मायने रखता है', 'कुछ भी बचाने से पहले हर ऋण पूरी तरह चुकाएं', '40 की उम्र तक रिटायरमेंट बचत को नज़रअंदाज़ करें', 'सिर्फ निवेश करें, ऋण और रिटायरमेंट को पूरी तरह छोड़ दें'],
  } },
}

const LEVEL_ADVISORY_TOPICS_TA = {
  1: [
    { fallbackQuiz: {
      question: 'என்கிட்ட மூணு கடன் சலுகைகள் இருக்கு — 3 வருஷத்துக்கு 9%, 5 வருஷத்துக்கு 7%, இல்ல 4 வருஷத்துக்கு 8%. மொத்த வட்டியில எது எனக்கு குறைவா இருக்கும்?',
      options: ['3 வருஷத்துக்கு 9%', '5 வருஷத்துக்கு 7%', '4 வருஷத்துக்கு 8%', 'எல்லாமே ஒண்ணுதான்'],
    } },
    { fallbackQuiz: {
      question: 'நான் என் எல்லா சேமிப்பையும் வீட்டுல பணமா வச்சிருக்கேன், வங்கி கணக்கு இல்ல — இது நிஜமா ஒரு பிரச்சினையா?',
      options: ['ஆமா — பாதுகாப்பு இல்ல, வட்டி இல்ல, டிஜிட்டல் பணம் பெற வழி இல்ல', 'இல்ல, பணம் எப்போதும் எந்த வங்கியை விடவும் பாதுகாப்பானது', 'ரெண்டுலயும் வித்தியாசம் இல்ல', 'பணக்காரங்களுக்கு மட்டும்தான் வங்கி கணக்கு தேவை'],
    } },
    { fallbackQuiz: {
      question: 'இப்போதான் முதல் சம்பளம் கிடைச்சிருக்கு, இந்த மாசம் எனக்கு பிடிச்ச விஷயங்களுக்கு எல்லாத்தையும் செலவு பண்ணணும்னு நினைக்கிறேன் — இது நல்ல யோசனையா?',
      options: ['முதல்ல சேமிப்ப ஒதுக்கி, மீதி இருக்கிறத செலவு பண்ணு', 'எல்லாத்தையும் செலவு பண்ணு, சேமிப்ப அடுத்த மாசம் ஆரம்பிக்கலாம்', '40 வயசுக்கு அப்புறம்தான் சேமிப்பு முக்கியம்', 'ரெண்டுலயும் உண்மையான வித்தியாசம் இல்ல'],
    } },
  ],
  2: [
    { fallbackQuiz: {
      question: 'யாரோ மெசேஜ் பண்ணி, அவங்க அனுப்பின லிங்க்ல என் UPI PIN-ஐ போட்டா எனக்கு ₹500 கிடைக்கும்னு சொன்னாங்க. நான் இதை செய்யணுமா?',
      options: ['வேண்டாம் — PIN பணம் அனுப்பறதுக்கு மட்டும்தான், வாங்கறதுக்கு ஒருபோதும் தேவையில்ல', 'ஆமா, மெசேஜ் ஆபீஸ்யலா இருந்தா', 'தொகை சின்னதா இருந்தா மட்டும்', 'இது வங்கி நம்பரா இருந்தா பரவாயில்ல'],
    } },
    { fallbackQuiz: {
      question: 'என் பேலன்ஸ் பாக்கணும், நண்பருக்கு பணம் அனுப்பணும் — இதுக்கு நெட்/மொபைல் பேங்கிங் அமைக்கிறது மதிப்புள்ளதா?',
      options: ['ஆமா — கிளைக்கு போறதுட்ட ஒப்பிடும்போது ரெண்டும் நொடிகள்ல ஆன்லைன்ல முடியும்', 'இல்ல, கிளைக்கு போறது எப்போதும் வேகமா இருக்கும்', 'பெரிய தொகைக்கு மட்டும்', 'நெட் பேங்கிங் நேரடியா போறதை விட ரிஸ்க் அதிகம்'],
    } },
    { fallbackQuiz: {
      question: 'நான் வங்கிய முழுசா நம்புறதால என் பாஸ்புக் அல்லது ஸ்டேட்மென்ட் ஒருபோதும் பாக்க மாட்டேன் — இது ரிஸ்க்கா?',
      options: ['ஆமா — தொடர்ந்து பாக்கிறதுதான் தவறு அல்லது மோசடிய சீக்கிரம் கண்டுபிடிக்கும் வழி', 'இல்ல, வங்கிகள் ஒருபோதும் தவறு செய்யாது', 'வருடத்துக்கு ஒருமுறை பாத்தா போதும்', 'ஸ்டேட்மென்ட் வரிக்காக மட்டும்தான்'],
    } },
  ],
  3: [
    { fallbackQuiz: {
      question: 'என்கிட்ட ஒரு வருஷத்துக்கு சேமிக்க ஒரு மொத்த தொகை இருக்கு — நான் ஃபிக்ஸட் டெபாசிட்ல போடணுமா இல்ல ரிகரிங் டெபாசிட் ஆரம்பிக்கணுமா?',
      options: ['ஃபிக்ஸட் டெபாசிட் — ஏற்கனவே இருக்கும் மொத்த தொகைக்கு இது பொருத்தமானது', 'ரிகரிங் டெபாசிட் — எந்த இலக்குக்கும் எப்போதும் சிறந்தது', 'வித்தியாசம் இல்ல, ரெண்டும் ஒண்ணுதான்', 'ரெண்டும் வேண்டாம், வீட்டுல பணமா வையுங்க'],
    } },
    { fallbackQuiz: {
      question: 'நான் ஒருபோதும் என் கிரெடிட் ஸ்கோரை பாக்கல, இப்போ ஒரு கடனுக்கு விண்ணப்பிக்கப் போறேன் — முதல்ல அதை பாக்கணுமா?',
      options: ['ஆமா — குறைவான ஸ்கோர் நிராகரிப்பு அல்லது அதிக வட்டி விகிதத்துக்கு வழிவகுக்கும்', 'இல்ல, கிரெடிட் ஸ்கோர் கிரெடிட் கார்டுக்கு மட்டும்தான் முக்கியம்', 'ஸ்கோர் கடன் அனுமதிய பாதிக்கவே பாதிக்காது', 'வணிகங்கள் மட்டும்தான் கிரெடிட் ஸ்கோர் பத்தி கவலைப்படணும்'],
    } },
    { fallbackQuiz: {
      question: 'நான் இளமையா ஆரோக்கியமா இருக்கேன், அதனால இப்போ சுகாதார காப்பீடு தேவையில்லைன்னு தோணுது — இது சரியான யோசனையா?',
      options: ['இல்ல — ஒரு அவசரநிலை சேமிப்ப முழுசா அழிச்சிடும்; காப்பீடு சீக்கிரம் வாங்கினா மலிவு', 'ஆமா, 50க்கு அப்புறம்தான் காப்பீடு மதிப்புள்ளது', 'நல்லா சாப்பிட்டா சுகாதார காப்பீடு தேவையில்ல', 'குடும்பம் இருந்தா மட்டும்தான் காப்பீடு முக்கியம்'],
    } },
  ],
  4: [
    { fallbackQuiz: {
      question: "யாரோ வங்கியிலிருந்து பேசுறோம்னு கூப்பிட்டு, ஒரு பிரச்சினை இருக்குன்னு சொல்லி, என்ன 'சரிபார்க்க' OTP கேட்டாங்க. இப்போ என்ன பண்றது?",
      options: ['போன கட் பண்ணுங்க — நிஜமான வங்கிகள் ஒருபோதும் கால்ல OTP கேக்காது', 'கொடுங்க, அவங்க வங்கியிலிருந்துன்னு சொன்னதால', 'முதல் 3 எண்கள் மட்டும் சொல்லுங்க', 'அவங்களுக்கு ஏற்கனவே என் அக்கவுன்ட் நம்பர் தெரிஞ்சிருந்தா பரவாயில்ல'],
    } },
    { fallbackQuiz: {
      question: "எனக்கு ஒரு SMS வந்துச்சு, உடனே கிளிக் பண்ணி 'சரிபார்க்காம' இருந்தா அக்கவுன்ட் பிளாக் ஆகும்னு ஒரு லிங்க் இருந்துச்சு. கிளிக் பண்றதா?",
      options: ['இல்ல — இது ஒரு க்ளாசிக் ஃபிஷிங் தந்திரம்; அதுக்கு பதிலா நேரடியா வங்கியை தொடர்பு கொள்ளுங்க', 'ஆமா, அவசரம்னா அது நிஜமா தான் இருக்கும்', '"bank" பேர்ல இருந்தா மட்டும் கிளிக் பண்ணுங்க', 'இதை குடும்பத்துக்கு ஃபார்வர்டு பண்ணிட்டு கிளிக் பண்ணுங்க'],
    } },
    { fallbackQuiz: {
      question: 'ATM-ல, PIN போடும்போது கீபேட்ட மூடி வைக்கிறது நிஜமா முக்கியமா?',
      options: ['ஆமா — இது மறைந்த கேமராக்கள் & பக்கத்துல பாக்கிறவங்களிடமிருந்து PIN திருடறத தடுக்கும்', 'இல்ல, ATM-கள் தானாகவே முழுசா பாதுகாப்பானது', 'இரவுல மட்டும் முக்கியம்', 'மூடி வைக்கிறது சந்தேகமா தெரியும், வேண்டாம்'],
    } },
  ],
  5: [
    { fallbackQuiz: {
      question: "மியூச்சுவல் ஃபண்ட்ல முதலீடு ஆரம்பிக்க 'சரியான நேரத்துக்கு' நான் காத்திருந்துகிட்டே இருக்கேன் — இது புத்திசாலித்தனமான உத்தியா?",
      options: ['இல்ல — சீக்கிரம் ஆரம்பிச்சு தொடர்ந்து இருக்கிறது (SIP) பொதுவா சந்தை நேரத்த யூகிக்கிறத விட மேல்', 'ஆமா, சந்தை நேரத்த சரியா யூகிக்கிறதுதான் சிறந்த வழி', 'மியூச்சுவல் ஃபண்ட் ஓய்வுக்கு நெருங்கியவங்களுக்கு மட்டும்தான்', 'சீக்கிரம் ஆரம்பிக்கிறதுல எந்த பலனும் இல்ல'],
    } },
    { fallbackQuiz: {
      question: 'எனக்கு 20களோட கடைசி வயசு — 40க்கு அப்புறம்தான் ஓய்வூதிய திட்டமிடல் பத்தி கவலைப்படணுமா?',
      options: ['இல்ல — சீக்கிரம் ஆரம்பிச்சா கூட்டு வட்டி பெரும்பாலான வேலைய தானா செய்யும்', 'ஆமா, 40க்கு முன்ன ஓய்வூதிய திட்டமிடல் அர்த்தமில்லாதது', 'அரசு ஊழியர்கள் மட்டும்தான் ஓய்வூதிய திட்டம் தேவை', 'கடன் தீரும்வரை ஓய்வூதிய சேமிப்ப காத்திருக்கணும்'],
    } },
    { fallbackQuiz: {
      question: "பணத்த சேமிக்க நான் ஒவ்வொரு மாசமும் என் கிரெடிட் கார்டுல 'குறைந்தபட்ச தொகை' மட்டும் கட்டுறேன் — இது நல்ல பழக்கமா?",
      options: ['இல்ல — மீதி இருக்கும் தொகைக்கு அதிக வட்டி ஏறிக்கிட்டே போகும், இது விலையுயர்ந்த பழக்கம்', 'ஆமா, குறைந்தபட்ச தொகைதான் புத்திசாலித்தனமான தேர்வா வடிவமைக்கப்பட்டிருக்கு', 'எதுவாவது கட்டுனா போதும், வித்தியாசம் இல்ல', 'குறைந்தபட்ச தொகைக்கு வட்டியே இல்ல'],
    } },
  ],
}

const LEVEL_CAPSTONE_QUESTS_TA = {
  1: { label: 'நகராட்சி அலுவலகம்', fallbackQuiz: {
    question: 'நகராட்சி அலுவலகம் புதிய குடியிருப்பாளர்களை முழுசா டிஜிட்டல் அடையாள சரிபார்ப்புக்கு மாத்திக்கிட்டிருக்கு — நகரத்துக்கு புதுசா வந்த ஒருவருக்கு இது நல்ல நடவடிக்கை ஆக இருக்கிற முக்கிய காரணம் என்ன?',
    options: ['மீண்டும் மீண்டும் காகித வேலை இல்லாம வேகமான, கண்காணிக்கக்கூடிய அடையாள ஆதாரம்', 'இது எந்த அடையாளத்தின் தேவையையும் நீக்கிடும்', 'இது முக்கியமா ஆபீஸ் அலங்காரச் செலவை குறைக்கத்தான்', 'டிஜிட்டல் பதிவுகள் காகித பதிவுகளை விட வேகமா காலாவதியாகும்'],
  } },
  2: { label: 'நெட் பேங்கிங் மையம்', fallbackQuiz: {
    question: "ஒரு அக்கம்பக்கத்தினர் முழுசா டிஜிட்டல் பேங்கிங்குக்கு மாற விரும்புறாங்க, ஆனா கிளைக்கு போறதை விட 'குறைவான பாதுகாப்பு' இருக்கும்னு கவலைப்படுறாங்க. அவங்களுக்கு சொல்ல வேண்டிய மிகச் சரியான விஷயம் என்ன?",
    options: ['அடிப்படை முன்னெச்சரிக்கைகளுடன் (வலுவான PIN, OTP பகிராதது) இது பாதுகாப்பானது — பணம் வைத்திருப்பதை விட பெரும்பாலும் பாதுகாப்பானது', 'டிஜிட்டல் பேங்கிங்குக்கு நிஜமான பாதுகாப்பே இல்ல', 'கிளைகள் எப்போதும் எந்த ஆப்பையும் விட 100% பாதுகாப்பானது', 'டிஜிட்டல் பேங்கிங் இளையவர்களுக்கு மட்டும்தான்'],
  } },
  3: { label: 'FD கவுண்டர்', fallbackQuiz: {
    question: '₹2 லட்சம் சேமிப்பும் கடனும் இல்லாத ஒருவர், முழு தொகையையும் ஒரே ஃபிக்ஸட் டெபாசிட்ல போடணுமா இல்ல FD, அவசர நிதி, சில மியூச்சுவல் ஃபண்ட்ஸ்ன்னு பிரிக்கணுமான்னு கேக்குறாரு. சிறந்த பொதுவான ஆலோசனை?',
    options: ['பிரி — முதல்ல அவசர நிதி, அப்புறம் ஒரே தேர்வுக்கு பதிலா பல்வகைப்படுத்து', 'எல்லாத்தையும் ஒரே FD-ல போடு, எளிமைதான் வெற்றி', 'செலவு செய், சேமிப்பு அதிகமா மதிப்பிடப்படுது', 'FD காலாவதியானது, ஒருபோதும் பயன்படுத்தக்கூடாது'],
  } },
  4: { label: 'சைபர் செல்', fallbackQuiz: {
    question: 'ஒரு குடியிருப்பாளர் ஏற்கனவே ஒரு சந்தேகத்துக்குரிய லிங்க்ல கிளிக் பண்ணி UPI PIN-ஐ போட்டுட்டாரு, அப்புறம்தான் அது மோசடின்னு தெரியவந்துச்சு. அவர் முதல்ல என்ன பண்ணணும்?',
    options: ['உடனே வங்கியை தொடர்பு கொண்டு அக்கவுன்ட்ட பிளாக்/ஃப்ரீஸ் பண்ணி க்ரெடென்ஷியல்ஸை மாத்தணும்', 'ஏதாவது நடக்குதான்னு ஒரு நாள் காத்திருக்கணும்', 'மெசேஜ்ஜை டெலீட் பண்ணிட்டு அப்புறம் போகணும்', 'நிஜமாவே மோசடின்னு "சோதிக்க" PIN-ஐ மறுபடியும் பகிரணும்'],
  } },
  5: { label: 'நிதி திட்டமிடல் அலுவலகம்', fallbackQuiz: {
    question: '30 வயசுல இருக்கும் ஒரு குடியிருப்பாளர், ஒரு சின்ன கடனை சீக்கிரம் தீர்ப்பது, ஓய்வூதிய சேமிப்ப ஆரம்பிப்பது, அல்லது மியூச்சுவல் ஃபண்ட் SIP-ஐ அதிகரிப்பது — எதுக்கு முன்னுரிமை தரணும்னு கேக்குறாரு. மிகவும் சமநிலையான அணுகுமுறை என்ன?',
    options: ['வட்டி குறைவா இருந்தா கடனை அதோட அட்டவணைப்படி வைச்சிட்டு, இப்பவே ஓய்வூதியம் + SIP ஆரம்பி — நேரம்தான் மிக முக்கியம்', 'எதுவும் சேமிக்கிறதுக்கு முன்னாடி ஒவ்வொரு கடனையும் முழுசா தீர்', '40களுக்கு அப்புறம் வரைக்கும் ஓய்வூதிய சேமிப்ப புறக்கணி', 'முதலீடு மட்டும் பண்ணு, கடன் & ஓய்வூதியத்த முழுசா தவிர்'],
  } },
}

function mergeAdvisoryTopics(base, overlay) {
  if (!overlay) return base
  const merged = {}
  for (const level of Object.keys(base)) {
    merged[level] = base[level].map((topicEntry, i) => {
      const t = overlay[level]?.[i]
      if (!t) return topicEntry
      return { ...topicEntry, fallbackQuiz: { ...topicEntry.fallbackQuiz, ...t.fallbackQuiz } }
    })
  }
  return merged
}

function mergeCapstoneQuests(base, overlay) {
  if (!overlay) return base
  const merged = {}
  for (const level of Object.keys(base)) {
    const t = overlay[level]
    merged[level] = t
      ? { ...base[level], ...t, fallbackQuiz: { ...base[level].fallbackQuiz, ...t.fallbackQuiz } }
      : base[level]
  }
  return merged
}

export function getLevelAdvisoryTopics(language = 'en') {
  if (language === 'hi') return mergeAdvisoryTopics(LEVEL_ADVISORY_TOPICS, LEVEL_ADVISORY_TOPICS_HI)
  if (language === 'ta') return mergeAdvisoryTopics(LEVEL_ADVISORY_TOPICS, LEVEL_ADVISORY_TOPICS_TA)
  return LEVEL_ADVISORY_TOPICS
}

export function getLevelCapstoneQuests(language = 'en') {
  if (language === 'hi') return mergeCapstoneQuests(LEVEL_CAPSTONE_QUESTS, LEVEL_CAPSTONE_QUESTS_HI)
  if (language === 'ta') return mergeCapstoneQuests(LEVEL_CAPSTONE_QUESTS, LEVEL_CAPSTONE_QUESTS_TA)
  return LEVEL_CAPSTONE_QUESTS
}

export function pickAdvisoryTopicForLevel(level, language = 'en') {
  const topics = getLevelAdvisoryTopics(language)
  const pool = topics[level] || topics[1]
  return pool[Math.floor(Math.random() * pool.length)]
}