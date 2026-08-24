import { resolveLocalized, makeLocalizedDict } from '../i18n/dataLocalization.js'

export const ADVISORY_SCRIPTS = {
  // ==========================================
  // LEVEL 1 SCRIPTS (Foundational Discipline)
  // ==========================================
  riya: {
    npcName: 'Riya',
    dilemmaLine: "Hey! Just got \u20b92,000 as a surprise gift. The sneakers I've been stalking for months just went on a 3-hour flash sale...",

    options: [
      { label: '\ud83d\udecd\ufe0f Grab them, treat yourself!', value: 'spend' },
      { label: '\u2696\ufe0f Buy a cheaper pair, save half', value: 'compromise' },
      { label: '\ud83d\udcb0 Stash it all away', value: 'save' },
    ],

    confirmQuestion: {
      spend: "True, you only live once! Checking out now.",
      compromise: "So skip the brand I really want? That feels like settling. Are you sure about this?",
      save: "You sure? The sale ends today. I'll miss out entirely. Still want me to skip it?",
    },

    robotHelpLine: {
      save: "\ud83d\udca1 Hint: Cash stashed away buys a lifeline later. Does that change your recommendation?",
      compromise: "\ud83d\udca1 Hint: Finding a middle ground satisfies the urge to spend while still building a safety net.",
    },

    // Closes out THIS visit the moment the choice is actually confirmed --
    // the consequence (resolutionLine below) doesn't land until the NEXT
    // beat, after a simulated "a few days later" time-skip (see
    // useAdvisoryConversation.js's confirmChoice), instead of both firing
    // back-to-back in the same breath.
    purchaseConfirmedLine: {
      spend: "Done \u2014 just bought them! Thank you SO much. Catch you later!",
      compromise: "Got the cheaper pair, bagged half the money too. Thanks for talking it through! See you around.",
      save: "Okay, decided against it \u2014 money's staying put. Appreciate you listening. Catch you later!",
    },

    spendDeclineLine: "True, you only live once! Checking out now.",

    resolutionLine: {
      spend: [
        "Oh my god... I really should have saved that money.",
        "My laptop charger just fried itself instantly.",
      ],
      compromise: [
        "Okay, so... remember when I bought the cheaper shoes? My laptop charger just fried itself right after.",
        "Good thing I didn't blow the whole ₹2,000 on the pricier pair.",
      ],
      save: [
        "Ugh, what a disaster. My laptop charger just fried itself out of nowhere.",
        "Good thing that ₹2,000 is still sitting there, untouched.",
      ],
    },

    // Real tap-choices between each resolution line -- replaces the old
    // passive "Continue" button. Both options converge on the same next
    // line (this is a reaction beat, not a branch), but the player still
    // gets an actual pick every single turn instead of one grey button.
    resolveReactionOptions: {
      spend: [
        [
          { label: 'Oh no, what happened?', value: 'react_ask' },
          { label: 'That bad, huh?', value: 'react_tease' },
        ],
      ],
      compromise: [
        [
          { label: 'Small win!', value: 'react_win' },
          { label: 'How much do you need for the fix?', value: 'react_ask' },
        ],
      ],
      save: [
        [
          { label: 'Perfect timing.', value: 'react_perfect' },
          { label: 'See, this is why you save.', value: 'react_lesson' },
        ],
      ],
    },

    midResolutionOptions: {
      spend: [
        { label: "Oh no, what are you going to do now?", value: "inquire_spend" },
        { label: "At least you have cool shoes?", value: "joke_spend" },
      ],
      compromise: [
        { label: "Do you have enough left to fix it?", value: "inquire_comp" },
        { label: "That's awful timing for your gear.", value: "sympathy_comp" },
      ],
      save: [
        { label: "Sorry to hear that! You okay?", value: "sympathy_save" },
        { label: "What are you going to do?", value: "inquire_save" },
      ],
    },

    postResolutionLine: {
      spend: "I have to wait for my salary to replace it. Literally can't do my assignments until then. Lesson learned.",
      compromise: "Because I saved half, I *just* had enough to cover the replacement. That was close!",
      save: "Well, because I saved it all, I bought a replacement instantly on Amazon. Total lifesaver.",
    },

    robotResolutionLine: {
      save: "\ud83e\udd16 Note: That's the secret cheat code. Keeping a buffer turns panic moments into minor annoyances.",
      compromise: "\ud83e\udd16 Note: Partial saving is still saving. A small buffer is infinitely better than zero.",
      spend: "\ud83e\udd16 Note: When there is zero cash buffer, every minor accident becomes a full-blown financial crisis.",
    },

    takeawayLine: "\ud83d\udca1 Lesson: Unplanned windfalls are best protected by a liquidity buffer, proving that even a partial safety net changes everything.",

    goodbyeOptions: [
      { label: "Glad it worked out! See you later, Riya.", value: "close_warm" },
      { label: "Lesson learned! Talk soon.", value: "close_casual" },
    ],

    signal: 'windfall_discipline',
  },

  arjun: {
    npcName: 'Arjun',
    dilemmaLine: "Salary just came in. First month I've actually got enough to think past just getting by. My friend's group trip booking closes today -- need to decide fast.",

    options: [
      { label: '\u2708\ufe0f Book the trip, full amount', value: 'trip' },
      { label: '\u2696\ufe0f Book a shorter version, save part', value: 'compromise' },
      { label: '\ud83c\udfe6 Set money aside first', value: 'save' },
    ],

    confirmQuestion: {
      trip: "Alright, trip's full amount booked! Should be a blast.",
      compromise: "Doing a scaled-down trip feels kind of half-hearted. Are you sure I shouldn't just go all out?",
      save: "Are you sure? That means missing out on the main group trip entirely today.",
    },

    robotHelpLine: {
      save: '\ud83d\udca1 Hint: Deciding your saving first, then living on the rest, beats hoping something is left over.',
      compromise: '\ud83d\udca1 Hint: Allocating a fixed percentage for fun while securing the baseline keeps both goals alive.',
    },

    purchaseConfirmedLine: {
      trip: "Booked! Full trip, no holding back. Thanks for hearing me out \u2014 see you around!",
      compromise: "Booked the shorter version, kept some salary back too. Appreciate it \u2014 catch you later!",
      save: "Alright, skipping the trip this time \u2014 money's staying in my account. Thanks! See you around.",
    },

    spendDeclineLine: "Alright, trip's booked! Should be a good one.",

    resolutionLine: {
      trip: [
        "Man, I am regretting going all-out on that trip.",
        "My phone screen just cracked right before work on Monday, and I have zero cash left for it.",
      ],
      compromise: [
        "So... remember the shorter trip I booked? My phone screen just cracked right before work on Monday.",
        "At least I kept some of my salary back before booking it.",
      ],
      save: [
        "Talk about bad luck -- my phone screen just cracked right before work on Monday.",
        "Good thing I hadn't touched my salary yet.",
      ],
    },

    resolveReactionOptions: {
      trip: [
        [
          { label: 'Oh no, what happened?', value: 'react_ask' },
          { label: 'How bad is it?', value: 'react_bad' },
        ],
      ],
      compromise: [
        [
          { label: "Good thing you held some back.", value: 'react_good' },
          { label: 'Will that be enough?', value: 'react_enough' },
        ],
      ],
      save: [
        [
          { label: 'Perfect timing.', value: 'react_perfect' },
          { label: "That's the whole point of saving first.", value: 'react_lesson' },
        ],
      ],
    },

    midResolutionOptions: {
      trip: [
        { label: "How are you going to manage work without a phone?", value: "inquire_trip" },
        { label: "That is terrible timing.", value: "sympathy_trip" },
      ],
      compromise: [
        { label: "Were you able to cover the repair bill?", value: "inquire_comp" },
        { label: "Oh no, bad timing!", value: "sympathy_comp" },
      ],
      save: [
        { label: "Can you get it fixed easily?", value: "inquire_save" },
        { label: "That's super stressful!", value: "sympathy_save" },
      ],
    },

    postResolutionLine: {
      trip: "I had to borrow money from a relative just to fix my work phone. Totally ruined the post-trip high.",
      compromise: "My partial savings stash covered the repair bill just in time. Phew, close call.",
      save: "I've got the repair fully covered out-of-pocket. Good thing I didn't touch my core savings.",
    },

    robotResolutionLine: {
      save: "\ud83e\udd16 Note: That's the idea -- decide savings up front, and everything else takes care of itself.",
      compromise: "\ud83e\udd16 Note: Automated allocation lets you enjoy life without sacrificing absolute emergency safety.",
      trip: "\ud83e\udd16 Note: Living entirely paycheck-to-paycheck turns standard device repairs into borrowing emergencies.",
    },

    takeawayLine: "\ud83d\udca1 Lesson: Paying yourself first by locking funds away beforehand ensures unexpected work emergencies never derail your peace of mind.",

    goodbyeOptions: [
      { label: "Glad you handled it! Catch you later, Arjun.", value: "close_warm" },
      { label: "Stay smart out there. Bye!", value: "close_casual" },
    ],

    signal: 'pay_yourself_first',
  },

  meera: {
    npcName: 'Meera',
    dilemmaLine: "This month's actually been great, way more orders than usual. Wish every month was like this. A supplier's offering bulk materials at a discount -- only today.",

    options: [
      { label: '\ud83d\udee0\ufe0f Spend the extra on the upgrade', value: 'upgrade' },
      { label: '\u2696\ufe0f Buy a small batch, save the rest', value: 'compromise' },
      { label: '\ud83d\udcb0 Set the extra aside', value: 'save' },
    ],

    confirmQuestion: {
      upgrade: "Went for the full upgrade -- hope it pays off!",
      save: "Are you sure? The full bulk discount won't come back.",
      compromise: "A partial order means missing out on maximum profit margins. Sure about this?",
    },

    robotHelpLine: {
      save: "\ud83d\udca1 Hint: Income like Meera's isn't steady month to month -- so the buffer has to be the plan.",
      compromise: "\ud83d\udca1 Hint: Balancing bulk discounts with liquid cash keeps growth active without risking insolvency.",
    },

    purchaseConfirmedLine: {
      upgrade: "Went ahead with the full upgrade! Fingers crossed it pays off. Thanks for the chat \u2014 see you around!",
      compromise: "Ordered a smaller batch, kept the rest back. Appreciate the second opinion \u2014 catch you later!",
      save: "Decided to hold onto the extra for now. Thanks for talking it through \u2014 see you around!",
    },

    spendDeclineLine: 'Went for the full upgrade -- hope it pays off!',

    resolutionLine: {
      save: [
        "Barely any orders this month. Rent's due Friday though.",
        "Good thing I set that extra aside instead of spending it.",
      ],
      compromise: [
        "Barely any orders this month. Rent's due Friday though.",
        "Good thing I didn't put everything into the bulk order.",
      ],
      upgrade: [
        "Barely any orders this month. Rent's due Friday though.",
        "And all my cash is tied up in inventory nobody is buying.",
      ],
    },

    resolveReactionOptions: {
      save: [
        [
          { label: "That buffer's paying off already.", value: 'react_buffer' },
          { label: 'Will it cover rent?', value: 'react_ask' },
        ],
      ],
      compromise: [
        [
          { label: 'Smart to keep some back.', value: 'react_smart' },
          { label: 'Will you make rent?', value: 'react_ask' },
        ],
      ],
      upgrade: [
        [
          { label: "That's rough.", value: 'react_sympathy' },
          { label: 'What are you going to do?', value: 'react_ask' },
        ],
      ],
    },

    midResolutionOptions: {
      save: [
        { label: "Do you have enough for rent?", value: "inquire_save" },
        { label: "Hang in there!", value: "sympathy_save" },
      ],
      compromise: [
        { label: "Will you make rent this week?", value: "inquire_comp" },
        { label: "Slow months are tough.", value: "sympathy_comp" },
      ],
      upgrade: [
        { label: "How are you paying rent?", value: "inquire_up" },
        { label: "That's a scary spot to be in.", value: "sympathy_up" },
      ],
    },

    postResolutionLine: {
      save: "Thank god I kept some back. Slow months happen -- I'm fully covered.",
      compromise: "The reserve cash I kept aside covered rent safely while the inventory waits.",
      upgrade: "I had to take a high-interest short-term loan just to pay rent. Wiped out all my profit.",
    },

    robotResolutionLine: {
      save: "\ud83e\udd16 Note: When income moves around, the cash buffer's what keeps everything steady.",
      compromise: "\ud83e\udd16 Note: For volatile revenue streams, hybrid budgeting prevents inventory traps.",
      upgrade: "\ud83e\udd16 Note: Over-investing fixed capital during peak months without a liquidity reserve triggers debt cycles.",
    },

    takeawayLine: "\ud83d\udca1 Lesson: For irregular income streams, maintaining a cash buffer is vital survival architecture, not just a passive savings choice.",

    goodbyeOptions: [
      { label: "Proud of how you handled it! See you, Meera.", value: "close_warm" },
      { label: "Good luck with next month's orders!", value: "close_casual" },
    ],

    signal: 'buffer_building',
  },

  // ==========================================
  // LEVEL 2 SCRIPT (Advanced Complexity)
  // ==========================================
  vikram: {
    npcName: 'Vikram',
    dilemmaLine: "Hey! I got a bonus of \u20b910,000, but my credit card bill is due, my gym membership auto-renewed, and my friends are planning a lavish weekend getaway.",

    options: [
      { label: '\ud83d\udcb3 Pay minimum due & blow the rest on the trip', value: 'reckless' },
      { label: '\u2696\ufe0f Clear the card fully, skip the trip, save the leftover', value: 'balanced' },
      { label: '\ud83c\udfe6 Lock 80% in a short FD, pay minimum card bill', value: 'stiff' },
    ],

    confirmQuestion: {
      reckless: "Trip booked, minimum paid, fingers crossed!",
      balanced: "Clearing the whole card and missing the trip? That feels super restrictive right now. Sure?",
      stiff: "Locking most of it away while leaving the credit card partially unpaid? High interest will stack up.",
    },

    robotHelpLine: {
      balanced: "\ud83d\udca1 Hint: High-interest credit card debt destroys wealth faster than trips build memories. Killing debt first is key.",
      stiff: "\ud83d\udca1 Hint: Saving money is good, but ignoring compounding credit card interest while locking cash in low FDs backfires.",
    },

    purchaseConfirmedLine: {
      reckless: "Trip's booked, minimum paid on the card. Fingers crossed! Catch you later!",
      balanced: "Card's cleared, skipping the trip this time. Thanks for the reality check \u2014 see you around!",
      stiff: "Locked most of it into an FD, paid the minimum. Appreciate it \u2014 catch you later!",
    },

    spendDeclineLine: "Trip booked, minimum paid, fingers crossed!",

    resolutionLine: {
      balanced: [
        "The credit card is fully zeroed out, and I avoided the compounding interest trap.",
        "No trip this month, but also zero debt hanging over me.",
      ],
      reckless: [
        "The trip was amazing, but my credit card interest rolled over and spiked my bill massively next month.",
        "I didn't realize the minimum payment barely touches the actual principal.",
      ],
      stiff: [
        "My credit card penalty charges hit hard because I only paid the minimum due.",
        "Meanwhile the FD barely earned enough to cover that extra interest.",
      ],
    },

    resolveReactionOptions: {
      balanced: [
        [
          { label: "That's real financial freedom.", value: 'react_freedom' },
          { label: 'Worth skipping the trip?', value: 'react_ask' },
        ],
      ],
      reckless: [
        [
          { label: 'Ouch, compounding interest is brutal.', value: 'react_ouch' },
          { label: 'How much extra are you paying?', value: 'react_ask' },
        ],
      ],
      stiff: [
        [
          { label: "The FD didn't really help then.", value: 'react_fd' },
          { label: 'That backfired fast.', value: 'react_backfire' },
        ],
      ],
    },

    midResolutionOptions: {
      balanced: [
        { label: "That's how you build real financial freedom!", value: "praise_bal" },
        { label: "Smart move clearing toxic debt.", value: "agree_bal" },
      ],
      reckless: [
        { label: "Ouch, that interest compounding is brutal.", value: "sympathy_rec" },
        { label: "Hope the trip was worth the debt.", value: "joke_rec" },
      ],
      stiff: [
        { label: "Never ignore credit card APR rates.", value: "advice_stiff" },
        { label: "That backfired quickly.", value: "sympathy_stiff" },
      ],
    },

    postResolutionLine: {
      balanced: "I have zero bad debt hanging over my head now. Total peace of mind.",
      reckless: "I spent two days of fun paying for six months of heavy interest fees. Never doing that again.",
      stiff: "The bank penalized me more than I earned on the FD. Worst of both worlds.",
    },

    robotResolutionLine: {
      balanced: "\ud83e\udd16 Note: Eliminating high-interest toxic debt is mathematically equivalent to a guaranteed, tax-free investment return.",
      reckless: "\ud83e\udd16 Note: Deferring credit card payments turns short-term leisure into long-term financial servitude.",
      stiff: "\ud83e\udd16 Note: Liquidity strategy must always prioritize high-cost liabilities before low-yield asset lock-ins.",
    },

    takeawayLine: "\ud83d\udca1 Level 2 Lesson: High-interest debt management must always take precedence over discretionary lifestyle spending or premature asset locking.",

    goodbyeOptions: [
      { label: "Brilliant execution! Catch you later, Vikram.", value: "close_warm" },
      { label: "Lesson locked in. Bye!", value: "close_casual" },
    ],

    signal: 'debt_elimination_priority',
  },

  // ==========================================
  // LEVEL 3 SCRIPT (Expert Strategy)
  // ==========================================
  aahan: {
    npcName: 'Aahan',
    dilemmaLine: "Big crossroads. I've saved up \u20b91.5 Lakhs. Do I dump it all into a high-risk crypto/meme asset that's trending up, split it between an index fund and crypto, or park it safely in a liquid debt fund while I study the market?",

    options: [
      { label: '\ud83d\ude80 All-in on the trending high-risk asset', value: 'reckless' },
      { label: '\u2696\ufe0f Hybrid split: 50% Index fund, 50% speculative asset', value: 'balanced' },
      { label: '\ud83d\udee1\ufe0f Liquid debt fund park + strict macro research', value: 'save' },
    ],

    confirmQuestion: {
      reckless: "Going full FOMO mode on a volatile asset? One macro market correction could wipe 80% out overnight. Sure?",
      balanced: "A 50/50 split exposes half your capital to extreme volatility. Are you comfortable with that risk profile?",
      save: "Playing it ultra-safe in a debt fund while a bull run happens? You might miss out on major capital gains. Sure?",
    },

    robotHelpLine: {
      reckless: "\ud83d\udca1 Expert Hint: Chasing momentum without a risk-management framework or capital preservation strategy is speculation, not investing.",
      balanced: "\ud83d\udca1 Expert Hint: Hybrid diversification protects core capital while capturing growth upside, but asset correlation matters.",
      save: "\ud83d\udca1 Expert Hint: Capital preservation is priority one during high macroeconomic uncertainty, but inflation drag must be managed.",
    },

    purchaseConfirmedLine: {
      reckless: "Going all in on it \u2014 let's see how this plays out. Thanks for talking it through \u2014 catch you later!",
      balanced: "Split it 50/50 like you suggested. Appreciate the perspective \u2014 see you around!",
      save: "Parking it safely for now while I study the market. Thanks \u2014 catch you later!",
    },

    spendDeclineLine: "Committed 100% to the high-risk play. Let's see what happens.",

    resolutionLine: {
      reckless: [
        "A sudden regulatory crackdown just triggered a massive market flash crash.",
        "My portfolio value just dropped by 70% in less than 4 hours, and I'm locked out of liquidity.",
      ],
      balanced: [
        "The market took a sharp downward correction today.",
        "My index fund allocation held steady, but the speculative half took a heavy hit. At least my core is cushioned.",
      ],
      save: [
        "The market just crashed hard across all speculative sectors.",
        "Because my capital was parked securely in a liquid debt fund, I emerged completely unscathed with zero drawdowns.",
      ],
    },

    resolveReactionOptions: {
      reckless: [
        [
          { label: "That's brutal.", value: 'react_brutal' },
          { label: 'Can you recover from that?', value: 'react_ask' },
        ],
      ],
      balanced: [
        [
          { label: 'Good thing you diversified.', value: 'react_good' },
          { label: 'How bad is the damage?', value: 'react_ask' },
        ],
      ],
      save: [
        [
          { label: 'Smart to stay liquid.', value: 'react_smart' },
          { label: 'Perfect timing to buy the dip.', value: 'react_ask' },
        ],
      ],
    },

    midResolutionOptions: {
      reckless: [
        { label: "That's the brutal reality of unhedged speculation.", value: "advice_reck" },
        { label: "Are you able to exit or are you trapped?", value: "inquire_reck" },
      ],
      balanced: [
        { label: "Diversification saved you from total wipeout.", value: "praise_bal" },
        { label: "How does the net portfolio look now?", value: "inquire_bal" },
      ],
      save: [
        { label: "Bulletproof capital preservation strategy!", value: "praise_save" },
        { label: "Now you have dry powder to buy the dip safely.", value: "insight_save" },
      ],
    },

    postResolutionLine: {
      reckless: "I panicked and sold at the absolute bottom just to salvage scraps. Months of savings vanished due to pure emotional FOMO.",
      balanced: "The blended strategy proved its worth. The stable asset absorbed the shock while the growth asset can recover over time.",
      save: "I preserved every single rupee of capital. Now that valuations have crashed, I can deploy money rationally into quality assets.",
    },

    robotResolutionLine: {
      reckless: "\ud83e\udd16 Expert Note: Unhedged exposure to high-beta sentiment assets without stop-losses guarantees catastrophic drawdowns.",
      balanced: "\ud83e\udd16 Note: Core-satellite asset allocation balances long-term wealth compounding with calculated tactical growth.",
      save: "\ud83e\udd16 Note: Liquidity insulation during peak market valuations is the mark of elite institutional portfolio management.",
    },

    takeawayLine: "\ud83d\udca1 Level 3 Expert Lesson: Long-term wealth generation is governed by disciplined asset allocation, risk-adjusted returns, and capital defense rather than speculative timing.",

    goodbyeOptions: [
      { label: "Masterclass in risk management. See you, Aahan!", value: "close_warm" },
      { label: "Invaluable market lesson. Bye!", value: "close_casual" },
    ],

    signal: 'expert_portfolio_risk_management',
  },
}

// Hindi/Tamil overlays -- see dataLocalization.js. `value` fields (option
// identifiers, resolution keys) are never translated, only the player-
// visible `label`/line text and `npcName` (transliterated for readability
// inside an otherwise-translated conversation).
const ADVISORY_SCRIPTS_HI = {
  riya: {
    npcName: 'रिया',
    dilemmaLine: "अरे! अभी-अभी उपहार में ₹2,000 मिले हैं। जिन स्नीकर्स को मैं महीनों से देख रही थी, वे अभी 3 घंटे की फ्लैश सेल में आ गए हैं...",
    options: [
      { label: '🛍️ ले लो, खुद को ट्रीट दो!', value: 'spend' },
      { label: '⚖️ सस्ती जोड़ी खरीदो, आधा बचाओ', value: 'compromise' },
      { label: '💰 सब कुछ बचाकर रख दो', value: 'save' },
    ],
    confirmQuestion: {
      spend: 'सच है, ज़िंदगी एक बार मिलती है! अभी चेकआउट कर रही हूं।',
      compromise: 'तो जो ब्रांड मुझे असल में चाहिए वो छोड़ दूं? यह समझौता जैसा लगता है। पक्का हो?',
      save: 'पक्का हो? सेल आज ही खत्म हो रही है। मैं पूरी तरह चूक जाऊंगी। फिर भी छोड़ दूं?',
    },
    robotHelpLine: {
      save: '💡 संकेत: बचाया हुआ पैसा बाद में एक सहारा बनता है। क्या इससे तुम्हारी सलाह बदलती है?',
      compromise: '💡 संकेत: बीच का रास्ता खर्च करने की इच्छा भी पूरी करता है और सुरक्षा कवच भी बनाता है।',
    },
    purchaseConfirmedLine: {
      spend: 'हो गया — अभी खरीद लिए! तुम्हारा बहुत-बहुत शुक्रिया। फिर मिलते हैं!',
      compromise: 'सस्ती जोड़ी ले ली, आधा पैसा भी बचा लिया। बात करने के लिए शुक्रिया! मिलते हैं।',
      save: 'ठीक है, नहीं लिए — पैसा वहीं रहेगा। सुनने के लिए शुक्रिया। फिर मिलते हैं!',
    },
    spendDeclineLine: 'सच है, ज़िंदगी एक बार मिलती है! अभी चेकआउट कर रही हूं।',
    resolutionLine: {
      spend: ['हे भगवान... मुझे वह पैसा सच में बचाना चाहिए था।', 'मेरे लैपटॉप का चार्जर अभी अचानक जल गया।'],
      compromise: ['अच्छा, तो... याद है जब मैंने सस्ती वाली जूतियां खरीदी थीं? उसके तुरंत बाद मेरे लैपटॉप का चार्जर जल गया।', 'अच्छा हुआ मैंने पूरे ₹2,000 महंगी वाली जोड़ी पर नहीं उड़ाए।'],
      save: ['उफ़, कैसी आफत है। मेरा लैपटॉप चार्जर अचानक जल गया।', 'अच्छा हुआ वो ₹2,000 अभी भी वहीं, बिना छुए पड़े हैं।'],
    },
    resolveReactionOptions: {
      spend: [[{ label: 'अरे नहीं, क्या हुआ?', value: 'react_ask' }, { label: 'इतना बुरा, हैं?', value: 'react_tease' }]],
      compromise: [[{ label: 'छोटी जीत!', value: 'react_win' }, { label: 'ठीक करवाने के लिए कितना चाहिए?', value: 'react_ask' }]],
      save: [[{ label: 'बिल्कुल सही समय।', value: 'react_perfect' }, { label: 'देखो, इसीलिए बचत करते हैं।', value: 'react_lesson' }]],
    },
    midResolutionOptions: {
      spend: [{ label: 'अरे नहीं, अब क्या करोगी?', value: 'inquire_spend' }, { label: 'कम से कम कूल जूते तो हैं?', value: 'joke_spend' }],
      compromise: [{ label: 'क्या ठीक करवाने के लिए काफी बचा है?', value: 'inquire_comp' }, { label: 'तुम्हारे गैजेट के लिए बहुत बुरा समय था।', value: 'sympathy_comp' }],
      save: [{ label: 'सुनकर बुरा लगा! तुम ठीक हो?', value: 'sympathy_save' }, { label: 'अब क्या करोगी?', value: 'inquire_save' }],
    },
    postResolutionLine: {
      spend: 'मुझे इसे बदलवाने के लिए सैलरी का इंतज़ार करना होगा। तब तक असाइनमेंट्स भी नहीं कर पाऊंगी। सबक मिल गया।',
      compromise: 'क्योंकि मैंने आधा बचाया था, बदलने के लिए *बस* इतना ही काफी था। बाल-बाल बची!',
      save: 'अच्छा हुआ, क्योंकि मैंने सब बचाया था, मैंने अमेज़न से तुरंत नया खरीद लिया। पूरा जीवनरक्षक।',
    },
    robotResolutionLine: {
      save: '🤖 नोट: यही असली गुप्त तरकीब है। एक सहारा रखने से घबराहट के पल छोटी परेशानी बन जाते हैं।',
      compromise: '🤖 नोट: थोड़ा बचाना भी बचाना ही है। थोड़ा सहारा शून्य से कहीं बेहतर है।',
      spend: '🤖 नोट: जब पैसे का कोई सहारा नहीं होता, हर छोटी दुर्घटना बड़ा वित्तीय संकट बन जाती है।',
    },
    takeawayLine: '💡 सबक: अचानक मिले पैसे को सबसे अच्छे से एक तरलता सहारे से सुरक्षित रखा जाता है, यह साबित करते हुए कि थोड़ा सा सुरक्षा कवच भी सब कुछ बदल देता है।',
    goodbyeOptions: [
      { label: 'अच्छा हुआ सब ठीक हो गया! फिर मिलते हैं, रिया।', value: 'close_warm' },
      { label: 'सबक मिल गया! जल्द बात करेंगे।', value: 'close_casual' },
    ],
  },

  arjun: {
    npcName: 'अर्जुन',
    dilemmaLine: "सैलरी अभी आई है। पहला महीना है जब जीने-भर से ज़्यादा सोचने लायक पैसा है। मेरे दोस्तों की ग्रुप ट्रिप की बुकिंग आज बंद हो रही है -- जल्दी तय करना है।",
    options: [
      { label: '✈️ पूरी रकम से ट्रिप बुक करो', value: 'trip' },
      { label: '⚖️ छोटा वर्जन बुक करो, कुछ बचाओ', value: 'compromise' },
      { label: '🏦 पहले पैसा अलग रखो', value: 'save' },
    ],
    confirmQuestion: {
      trip: 'ठीक है, ट्रिप पूरी रकम से बुक हो गई! मज़ा आएगा।',
      compromise: 'छोटी ट्रिप करना कुछ अधूरा सा लगता है। पक्का है कि मुझे पूरा नहीं करना चाहिए?',
      save: 'पक्का हो? इसका मतलब है आज की मुख्य ग्रुप ट्रिप पूरी तरह छूट जाएगी।',
    },
    robotHelpLine: {
      save: '💡 संकेत: पहले बचत तय करना, फिर बाकी पर जीना, यह उम्मीद करने से बेहतर है कि कुछ बच जाएगा।',
      compromise: '💡 संकेत: मस्ती के लिए एक तय हिस्सा रखते हुए आधार सुरक्षित करना दोनों लक्ष्य जिंदा रखता है।',
    },
    purchaseConfirmedLine: {
      trip: 'बुक हो गया! पूरी ट्रिप, बिना रुके। मेरी बात सुनने के लिए शुक्रिया — मिलते हैं!',
      compromise: 'छोटी ट्रिप बुक कर ली, कुछ सैलरी भी बचा ली। शुक्रिया — फिर मिलते हैं!',
      save: 'ठीक है, इस बार ट्रिप छोड़ रहा हूं — पैसा अकाउंट में ही रहेगा। शुक्रिया! मिलते हैं।',
    },
    spendDeclineLine: 'ठीक है, ट्रिप बुक हो गई! अच्छी रहेगी।',
    resolutionLine: {
      trip: ['यार, मुझे उस ट्रिप पर पूरा पैसा लगाने का अफ़सोस हो रहा है।', 'सोमवार को काम से पहले ही मेरे फोन की स्क्रीन टूट गई, और उसके लिए मेरे पास बिल्कुल पैसा नहीं है।'],
      compromise: ['तो... याद है वो छोटी ट्रिप जो मैंने बुक की थी? सोमवार को काम से पहले ही मेरे फोन की स्क्रीन टूट गई।', 'अच्छा हुआ बुक करने से पहले सैलरी का कुछ हिस्सा बचा लिया था।'],
      save: ['बुरी किस्मत की बात करें -- सोमवार को काम से पहले ही मेरे फोन की स्क्रीन टूट गई।', 'अच्छा हुआ मैंने अपनी सैलरी को अभी तक छुआ नहीं था।'],
    },
    resolveReactionOptions: {
      trip: [[{ label: 'अरे नहीं, क्या हुआ?', value: 'react_ask' }, { label: 'कितना बुरा है?', value: 'react_bad' }]],
      compromise: [[{ label: 'अच्छा हुआ कुछ बचाकर रखा था।', value: 'react_good' }, { label: 'क्या यह काफी होगा?', value: 'react_enough' }]],
      save: [[{ label: 'बिल्कुल सही समय।', value: 'react_perfect' }, { label: 'पहले बचत करने का यही तो मतलब है।', value: 'react_lesson' }]],
    },
    midResolutionOptions: {
      trip: [{ label: 'फोन के बिना काम कैसे संभालोगे?', value: 'inquire_trip' }, { label: 'यह बहुत बुरा समय है।', value: 'sympathy_trip' }],
      compromise: [{ label: 'क्या मरम्मत का बिल भर पाए?', value: 'inquire_comp' }, { label: 'अरे नहीं, बुरा समय!', value: 'sympathy_comp' }],
      save: [{ label: 'क्या इसे आसानी से ठीक करवा सकते हो?', value: 'inquire_save' }, { label: 'यह बहुत तनावपूर्ण है!', value: 'sympathy_save' }],
    },
    postResolutionLine: {
      trip: 'मुझे अपने काम वाले फोन को ठीक करवाने के लिए एक रिश्तेदार से पैसे उधार लेने पड़े। ट्रिप के बाद के मज़े पर पूरी तरह पानी फिर गया।',
      compromise: 'मेरी थोड़ी बचत ने ठीक समय पर मरम्मत का बिल भर दिया। उफ़, बाल-बाल बचा।',
      save: 'मरम्मत का पूरा खर्च मैंने खुद उठाया। अच्छा हुआ मैंने अपनी मुख्य बचत को हाथ नहीं लगाया।',
    },
    robotResolutionLine: {
      save: '🤖 नोट: यही तरीका है -- पहले बचत तय करो, बाकी सब खुद संभल जाता है।',
      compromise: '🤖 नोट: अपने आप अलग रखा पैसा बिना पूरी सुरक्षा खोए ज़िंदगी का मज़ा लेने देता है।',
      trip: '🤖 नोट: पूरी तरह सैलरी-से-सैलरी जीना, सामान्य मरम्मत को भी उधार का संकट बना देता है।',
    },
    takeawayLine: '💡 सबक: पहले खुद को भुगतान करना यानी पैसे पहले ही अलग रखना, यह पक्का करता है कि काम से जुड़ी अचानक परेशानियां कभी तुम्हारी शांति नहीं बिगाड़ें।',
    goodbyeOptions: [
      { label: 'अच्छा हुआ तुमने संभाल लिया! फिर मिलते हैं, अर्जुन।', value: 'close_warm' },
      { label: 'समझदारी से रहना। बाय!', value: 'close_casual' },
    ],
  },

  meera: {
    npcName: 'मीरा',
    dilemmaLine: 'इस महीने सच में बहुत अच्छा रहा, हमेशा से ज़्यादा ऑर्डर। काश हर महीना ऐसा ही हो। एक सप्लायर आज ही थोक सामान पर छूट दे रहा है।',
    options: [
      { label: '🛠️ अतिरिक्त पैसा अपग्रेड पर खर्च करो', value: 'upgrade' },
      { label: '⚖️ छोटा बैच खरीदो, बाकी बचाओ', value: 'compromise' },
      { label: '💰 अतिरिक्त पैसा अलग रखो', value: 'save' },
    ],
    confirmQuestion: {
      upgrade: 'पूरा अपग्रेड कर दिया -- उम्मीद है फायदा होगा!',
      save: 'पक्का हो? यह पूरा थोक छूट फिर नहीं मिलेगी।',
      compromise: 'छोटा ऑर्डर मतलब पूरा मुनाफा मार्जिन छूट जाना। पक्का हो?',
    },
    robotHelpLine: {
      save: '💡 संकेत: मीरा जैसी आमदनी हर महीने स्थिर नहीं होती -- इसलिए सहारा ही असली योजना होनी चाहिए।',
      compromise: '💡 संकेत: थोक छूट और नकद, दोनों को संतुलित रखना बिना जोखिम के विकास बनाए रखता है।',
    },
    purchaseConfirmedLine: {
      upgrade: 'पूरा अपग्रेड कर दिया! उम्मीद है फायदा होगा। बात करने के लिए शुक्रिया — मिलते हैं!',
      compromise: 'छोटा बैच ऑर्डर किया, बाकी बचा लिया। दूसरी राय के लिए शुक्रिया — फिर मिलते हैं!',
      save: 'अभी के लिए अतिरिक्त पैसा रोक लिया। बात करने के लिए शुक्रिया — मिलते हैं!',
    },
    spendDeclineLine: 'पूरा अपग्रेड कर दिया -- उम्मीद है फायदा होगा!',
    resolutionLine: {
      save: ['इस महीने मुश्किल से कोई ऑर्डर आया। पर किराया शुक्रवार को देना है।', 'अच्छा हुआ मैंने वो अतिरिक्त पैसा खर्च करने की बजाय अलग रखा।'],
      compromise: ['इस महीने मुश्किल से कोई ऑर्डर आया। पर किराया शुक्रवार को देना है।', 'अच्छा हुआ मैंने सब कुछ थोक ऑर्डर में नहीं लगाया।'],
      upgrade: ['इस महीने मुश्किल से कोई ऑर्डर आया। पर किराया शुक्रवार को देना है।', 'और मेरा सारा पैसा उस माल में फंसा है जिसे कोई नहीं खरीद रहा।'],
    },
    resolveReactionOptions: {
      save: [[{ label: 'वह सहारा अभी से काम आ रहा है।', value: 'react_buffer' }, { label: 'क्या यह किराया भर देगा?', value: 'react_ask' }]],
      compromise: [[{ label: 'कुछ बचाकर रखना समझदारी थी।', value: 'react_smart' }, { label: 'किराया दे पाओगी?', value: 'react_ask' }]],
      upgrade: [[{ label: 'यह मुश्किल है।', value: 'react_sympathy' }, { label: 'अब क्या करोगी?', value: 'react_ask' }]],
    },
    midResolutionOptions: {
      save: [{ label: 'क्या किराए के लिए काफी है?', value: 'inquire_save' }, { label: 'हिम्मत रखो!', value: 'sympathy_save' }],
      compromise: [{ label: 'इस हफ्ते किराया दे पाओगी?', value: 'inquire_comp' }, { label: 'सुस्त महीने मुश्किल होते हैं।', value: 'sympathy_comp' }],
      upgrade: [{ label: 'किराया कैसे भरोगी?', value: 'inquire_up' }, { label: 'यह बहुत डरावनी स्थिति है।', value: 'sympathy_up' }],
    },
    postResolutionLine: {
      save: 'शुक्र है मैंने कुछ बचाकर रखा था। सुस्त महीने आते ही रहते हैं -- मैं पूरी तरह सुरक्षित हूं।',
      compromise: 'जो पैसा मैंने अलग रखा था उसने माल के इंतज़ार में सुरक्षित रूप से किराया भर दिया।',
      upgrade: 'मुझे किराया भरने के लिए ऊंची ब्याज दर वाला छोटी अवधि का कर्ज़ लेना पड़ा। मेरा सारा मुनाफा खत्म हो गया।',
    },
    robotResolutionLine: {
      save: '🤖 नोट: जब आमदनी घटती-बढ़ती है, नकद सहारा ही सब कुछ स्थिर रखता है।',
      compromise: '🤖 नोट: अनियमित आमदनी के लिए मिश्रित बजट माल के जाल से बचाता है।',
      upgrade: '🤖 नोट: बिना तरल सहारे के व्यस्त महीनों में ज़्यादा निवेश करना कर्ज़ के चक्र को जन्म देता है।',
    },
    takeawayLine: '💡 सबक: अनियमित आमदनी के लिए, नकद सहारा बनाए रखना ज़रूरी जीवनरेखा है, सिर्फ एक साधारण बचत का विकल्प नहीं।',
    goodbyeOptions: [
      { label: 'तुमने जैसे संभाला उस पर गर्व है! मिलते हैं, मीरा।', value: 'close_warm' },
      { label: 'अगले महीने के ऑर्डर के लिए शुभकामनाएं!', value: 'close_casual' },
    ],
  },

  vikram: {
    npcName: 'विक्रम',
    dilemmaLine: 'अरे! मुझे ₹10,000 का बोनस मिला है, पर मेरा क्रेडिट कार्ड बिल देना है, जिम की सदस्यता अपने आप रिन्यू हो गई है, और मेरे दोस्त एक शानदार वीकेंड ट्रिप की योजना बना रहे हैं।',
    options: [
      { label: '💳 न्यूनतम बिल भरो और बाकी ट्रिप पर उड़ाओ', value: 'reckless' },
      { label: '⚖️ पूरा कार्ड चुकाओ, ट्रिप छोड़ो, बाकी बचाओ', value: 'balanced' },
      { label: '🏦 80% को छोटी FD में लॉक करो, न्यूनतम कार्ड बिल भरो', value: 'stiff' },
    ],
    confirmQuestion: {
      reckless: 'ट्रिप बुक, न्यूनतम भर दिया, उंगलियां क्रॉस किए हुए हैं!',
      balanced: 'पूरा कार्ड चुकाना और ट्रिप छोड़ना? अभी यह बहुत सख्त लगता है। पक्का हो?',
      stiff: 'ज़्यादातर पैसा लॉक करना जबकि क्रेडिट कार्ड आंशिक रूप से अनपेड रह जाए? ऊंचा ब्याज बढ़ता जाएगा।',
    },
    robotHelpLine: {
      balanced: '💡 संकेत: ऊंचे ब्याज वाला क्रेडिट कार्ड कर्ज़ ट्रिप की यादों से कहीं तेज़ी से पैसा बर्बाद करता है। पहले कर्ज़ खत्म करना ज़रूरी है।',
      stiff: '💡 संकेत: पैसा बचाना अच्छा है, पर बढ़ते क्रेडिट कार्ड ब्याज को नज़रअंदाज़ करते हुए कम-रिटर्न वाली FD में पैसा लॉक करना उल्टा पड़ता है।',
    },
    purchaseConfirmedLine: {
      reckless: 'ट्रिप बुक, कार्ड पर न्यूनतम भर दिया। उंगलियां क्रॉस! फिर मिलते हैं!',
      balanced: 'कार्ड चुका दिया, इस बार ट्रिप छोड़ रहा हूं। सच्चाई दिखाने के लिए शुक्रिया — मिलते हैं!',
      stiff: 'ज़्यादातर FD में लॉक कर दिया, न्यूनतम भर दिया। शुक्रिया — फिर मिलते हैं!',
    },
    spendDeclineLine: 'ट्रिप बुक, न्यूनतम भर दिया, उंगलियां क्रॉस किए हुए हैं!',
    resolutionLine: {
      balanced: ['क्रेडिट कार्ड पूरी तरह चुका दिया, और मैं बढ़ते ब्याज के जाल से बच गया।', 'इस महीने कोई ट्रिप नहीं, पर सिर पर कोई कर्ज़ भी नहीं।'],
      reckless: ['ट्रिप शानदार थी, पर मेरे क्रेडिट कार्ड का ब्याज आगे बढ़ गया और अगले महीने बिल बहुत बढ़ गया।', 'मुझे एहसास नहीं था कि न्यूनतम भुगतान असली मूलधन को मुश्किल से छूता है।'],
      stiff: ['सिर्फ न्यूनतम बिल भरने की वजह से क्रेडिट कार्ड की पेनल्टी भारी पड़ी।', 'इस बीच FD ने उस अतिरिक्त ब्याज को कवर करने लायक भी मुश्किल से कमाया।'],
    },
    resolveReactionOptions: {
      balanced: [[{ label: 'यही असली वित्तीय आज़ादी है।', value: 'react_freedom' }, { label: 'ट्रिप छोड़ना सही था?', value: 'react_ask' }]],
      reckless: [[{ label: 'उफ़, बढ़ता ब्याज बहुत क्रूर है।', value: 'react_ouch' }, { label: 'कितना अतिरिक्त भर रहे हो?', value: 'react_ask' }]],
      stiff: [[{ label: 'तो FD ने असल में मदद नहीं की।', value: 'react_fd' }, { label: 'यह जल्दी उल्टा पड़ गया।', value: 'react_backfire' }]],
    },
    midResolutionOptions: {
      balanced: [{ label: 'असली वित्तीय आज़ादी ऐसे ही बनती है!', value: 'praise_bal' }, { label: 'ज़हरीला कर्ज़ चुकाना समझदारी थी।', value: 'agree_bal' }],
      reckless: [{ label: 'उफ़, वह बढ़ता ब्याज बहुत क्रूर है।', value: 'sympathy_rec' }, { label: 'उम्मीद है ट्रिप उस कर्ज़ के लायक थी।', value: 'joke_rec' }],
      stiff: [{ label: 'क्रेडिट कार्ड की APR दरों को कभी नज़रअंदाज़ मत करो।', value: 'advice_stiff' }, { label: 'यह जल्दी उल्टा पड़ गया।', value: 'sympathy_stiff' }],
    },
    postResolutionLine: {
      balanced: 'अब मेरे सिर पर कोई बुरा कर्ज़ नहीं है। पूरी मानसिक शांति।',
      reckless: 'मैंने दो दिन की मस्ती के लिए छह महीने भारी ब्याज चुकाया। अब कभी ऐसा नहीं करूंगा।',
      stiff: 'बैंक ने मुझे उतना जुर्माना लगाया जितना मैंने FD पर कमाया। दोनों तरफ से नुकसान।',
    },
    robotResolutionLine: {
      balanced: '🤖 नोट: ऊंचे ब्याज वाले ज़हरीले कर्ज़ को खत्म करना गणितीय रूप से एक गारंटीड, टैक्स-फ्री निवेश रिटर्न के बराबर है।',
      reckless: '🤖 नोट: क्रेडिट कार्ड भुगतान टालना छोटी अवधि के मज़े को लंबी अवधि की वित्तीय गुलामी में बदल देता है।',
      stiff: '🤖 नोट: तरलता रणनीति में हमेशा ऊंचे-खर्च वाली देनदारियों को कम-रिटर्न वाली संपत्तियों में पैसा लॉक करने से पहले प्राथमिकता देनी चाहिए।',
    },
    takeawayLine: '💡 स्तर 2 सबक: ऊंचे ब्याज वाले कर्ज़ का प्रबंधन हमेशा ऐच्छिक जीवनशैली खर्च या जल्दबाज़ी में संपत्ति लॉक करने से पहले आना चाहिए।',
    goodbyeOptions: [
      { label: 'शानदार तरीका! फिर मिलते हैं, विक्रम।', value: 'close_warm' },
      { label: 'सबक याद रहेगा। बाय!', value: 'close_casual' },
    ],
  },

  aahan: {
    npcName: 'आहान',
    dilemmaLine: 'बड़ा मोड़ है। मैंने ₹1.5 लाख बचाए हैं। क्या मैं इसे पूरा एक ट्रेंडिंग हाई-रिस्क क्रिप्टो/मीम एसेट में लगा दूं, इंडेक्स फंड और क्रिप्टो में बांट दूं, या बाज़ार को समझने तक इसे सुरक्षित रूप से एक लिक्विड डेट फंड में रखूं?',
    options: [
      { label: '🚀 ट्रेंडिंग हाई-रिस्क एसेट में सब कुछ लगाओ', value: 'reckless' },
      { label: '⚖️ मिश्रित बंटवारा: 50% इंडेक्स फंड, 50% सट्टा एसेट', value: 'balanced' },
      { label: '🛡️ लिक्विड डेट फंड में रखो + सख्त मैक्रो रिसर्च', value: 'save' },
    ],
    confirmQuestion: {
      reckless: 'एक अस्थिर एसेट पर पूरा FOMO मोड? एक मैक्रो मार्केट करेक्शन रातोंरात 80% उड़ा सकता है। पक्का हो?',
      balanced: '50/50 बंटवारा आधी पूंजी को भारी उतार-चढ़ाव के सामने रखता है। क्या यह जोखिम स्तर तुम्हें ठीक लगता है?',
      save: 'बुल रन के दौरान डेट फंड में बिल्कुल सुरक्षित खेलना? बड़ा मुनाफा छूट सकता है। पक्का हो?',
    },
    robotHelpLine: {
      reckless: '💡 विशेषज्ञ संकेत: बिना जोखिम-प्रबंधन ढांचे या पूंजी सुरक्षा रणनीति के मोमेंटम का पीछा करना निवेश नहीं, सट्टा है।',
      balanced: '💡 विशेषज्ञ संकेत: मिश्रित विविधीकरण मुख्य पूंजी की रक्षा करते हुए विकास का फायदा उठाता है, पर एसेट सहसंबंध मायने रखता है।',
      save: '💡 विशेषज्ञ संकेत: भारी आर्थिक अनिश्चितता के दौरान पूंजी सुरक्षा पहली प्राथमिकता है, पर महंगाई के असर को भी संभालना ज़रूरी है।',
    },
    purchaseConfirmedLine: {
      reckless: 'पूरा इसी में लगा रहा हूं — देखते हैं क्या होता है। बात करने के लिए शुक्रिया — फिर मिलते हैं!',
      balanced: 'जैसा तुमने कहा वैसे 50/50 बांट दिया। नज़रिए के लिए शुक्रिया — मिलते हैं!',
      save: 'बाज़ार समझने तक इसे अभी सुरक्षित रख रहा हूं। शुक्रिया — फिर मिलते हैं!',
    },
    spendDeclineLine: 'हाई-रिस्क दांव पर 100% प्रतिबद्ध। देखते हैं क्या होता है।',
    resolutionLine: {
      reckless: ['अचानक एक नियामक कार्रवाई ने बड़ा मार्केट फ्लैश क्रैश ला दिया।', 'मेरी पूंजी की कीमत 4 घंटे से कम में 70% गिर गई, और मैं तरलता से बाहर हो गया।'],
      balanced: ['आज बाज़ार में तेज़ गिरावट आई।', 'मेरा इंडेक्स फंड हिस्सा स्थिर रहा, पर सट्टा वाला हिस्सा भारी चपेट में आया। कम से कम मेरा आधार सुरक्षित है।'],
      save: ['सभी सट्टा क्षेत्रों में बाज़ार बुरी तरह गिर गया।', 'क्योंकि मेरी पूंजी सुरक्षित रूप से लिक्विड डेट फंड में थी, मैं बिना किसी नुकसान के पूरी तरह सुरक्षित निकला।'],
    },
    resolveReactionOptions: {
      reckless: [[{ label: 'यह बहुत बुरा है।', value: 'react_brutal' }, { label: 'क्या इससे उबर पाओगे?', value: 'react_ask' }]],
      balanced: [[{ label: 'अच्छा हुआ तुमने विविधता रखी।', value: 'react_good' }, { label: 'नुकसान कितना बुरा है?', value: 'react_ask' }]],
      save: [[{ label: 'तरल बने रहना समझदारी थी।', value: 'react_smart' }, { label: 'गिरावट में खरीदने का सही समय।', value: 'react_ask' }]],
    },
    midResolutionOptions: {
      reckless: [{ label: 'यही बिना बचाव वाले सट्टे की क्रूर सच्चाई है।', value: 'advice_reck' }, { label: 'क्या तुम निकल सकते हो या फंस गए हो?', value: 'inquire_reck' }],
      balanced: [{ label: 'विविधीकरण ने तुम्हें पूरी तबाही से बचाया।', value: 'praise_bal' }, { label: 'अब पूरा पोर्टफोलियो कैसा दिख रहा है?', value: 'inquire_bal' }],
      save: [{ label: 'बेहतरीन पूंजी सुरक्षा रणनीति!', value: 'praise_save' }, { label: 'अब गिरावट में सुरक्षित खरीदारी के लिए तुम्हारे पास पैसा है।', value: 'insight_save' }],
    },
    postResolutionLine: {
      reckless: 'मैं घबरा गया और बचे-खुचे को बचाने के लिए एकदम नीचे बेच दिया। शुद्ध भावनात्मक FOMO की वजह से महीनों की बचत गायब हो गई।',
      balanced: 'मिश्रित रणनीति ने अपनी कीमत साबित कर दी। स्थिर एसेट ने झटका सहा जबकि विकास वाला एसेट समय के साथ उबर सकता है।',
      save: 'मैंने अपनी पूंजी का एक-एक रुपया सुरक्षित रखा। अब जब वैल्यूएशन गिर गई है, मैं समझदारी से अच्छी संपत्तियों में पैसा लगा सकता हूं।',
    },
    robotResolutionLine: {
      reckless: '🤖 विशेषज्ञ नोट: बिना स्टॉप-लॉस के उच्च-अस्थिरता वाली भावना-चालित संपत्तियों में बिना बचाव के निवेश करना भयंकर नुकसान की गारंटी देता है।',
      balanced: '🤖 नोट: कोर-सैटेलाइट एसेट आवंटन लंबी अवधि की संपत्ति वृद्धि को सोच-समझकर तेज़ विकास के साथ संतुलित करता है।',
      save: '🤖 नोट: बाज़ार के चरम मूल्यांकन के दौरान तरलता बनाए रखना एक बेहतरीन संस्थागत पोर्टफोलियो प्रबंधन की पहचान है।',
    },
    takeawayLine: '💡 स्तर 3 विशेषज्ञ सबक: लंबी अवधि की संपत्ति वृद्धि अनुशासित एसेट आवंटन, जोखिम-समायोजित रिटर्न, और सट्टेबाज़ी वाले समय के बजाय पूंजी की रक्षा से तय होती है।',
    goodbyeOptions: [
      { label: 'जोखिम प्रबंधन में मास्टरक्लास। मिलते हैं, आहान!', value: 'close_warm' },
      { label: 'अनमोल बाज़ार सबक। बाय!', value: 'close_casual' },
    ],
  },
}

const ADVISORY_SCRIPTS_TA = {
  riya: {
    npcName: 'ரியா',
    dilemmaLine: 'ஏய்! இப்போதுதான் பரிசா ₹2,000 கிடைச்சிருக்கு. நான் மாசக்கணக்கா பாத்துகிட்டிருந்த ஸ்னீக்கர்ஸ் இப்போ 3 மணி நேர ஃபிளாஷ் சேலுக்கு வந்திருக்கு...',
    options: [
      { label: '🛍️ வாங்கிடு, உன்னையே ட்ரீட் பண்ணு!', value: 'spend' },
      { label: '⚖️ மலிவான ஜோடி வாங்கு, பாதி சேமி', value: 'compromise' },
      { label: '💰 எல்லாத்தையும் சேமிச்சு வை', value: 'save' },
    ],
    confirmQuestion: {
      spend: 'உண்மைதான், வாழ்க்கை ஒரே தடவைதான்! இப்போ செக்அவுட் பண்றேன்.',
      compromise: 'எனக்கு நிஜமா வேண்டிய பிராண்ட விட்டுடலாமா? இது சமரசம் மாதிரி தோணுது. உறுதியா இருக்கியா?',
      save: 'உறுதியா? சேல் இன்னிக்கே முடிஞ்சிடும். நான் முழுசா தவற விடுவேன். இருந்தாலும் விட்டுடச் சொல்றியா?',
    },
    robotHelpLine: {
      save: '💡 குறிப்பு: சேமிச்சு வச்ச பணம் அப்புறம் ஒரு ஆதரவா இருக்கும். இது உன் ஆலோசனையை மாத்துதா?',
      compromise: '💡 குறிப்பு: நடுநிலை தேர்வு செலவு செய்ய வேண்டுமுன்ற ஆசையையும் தீர்க்கும், பாதுகாப்பு வலையையும் உருவாக்கும்.',
    },
    purchaseConfirmedLine: {
      spend: 'ஆயிடுச்சு — இப்போதான் வாங்கிட்டேன்! ரொம்ப நன்றி. பிறகு பார்க்கலாம்!',
      compromise: 'மலிவான ஜோடி வாங்கிட்டேன், பாதி பணமும் சேமிச்சேன். பேசினதுக்கு நன்றி! பார்க்கலாம்.',
      save: 'சரி, வாங்கல — பணம் அப்படியே இருக்கும். கேட்டதுக்கு நன்றி. பிறகு பார்க்கலாம்!',
    },
    spendDeclineLine: 'உண்மைதான், வாழ்க்கை ஒரே தடவைதான்! இப்போ செக்அவுட் பண்றேன்.',
    resolutionLine: {
      spend: ['ஐயோ கடவுளே... அந்தப் பணத்த நான் சேமிச்சிருக்கணும்.', 'என் லேப்டாப் சார்ஜர் இப்போதான் திடீர்னு எரிஞ்சுடுச்சு.'],
      compromise: ['சரி, அது... நான் மலிவான ஷூ வாங்கினது ஞாபகமா? அதுக்கு அப்புறம் உடனே என் லேப்டாப் சார்ஜர் எரிஞ்சுடுச்சு.', 'நல்லவேளை முழு ₹2,000ஐயும் விலை அதிகமான ஜோடிக்கு செலவழிக்கல.'],
      save: ['அய்யோ, என்ன ஒரு பேரழிவு. என் லேப்டாப் சார்ஜர் திடீர்னு எரிஞ்சுடுச்சு.', 'நல்லவேளை அந்த ₹2,000 இன்னும் தொடாம அப்படியே இருக்கு.'],
    },
    resolveReactionOptions: {
      spend: [[{ label: 'அய்யோ, என்ன ஆச்சு?', value: 'react_ask' }, { label: 'அவ்ளோ மோசமா?', value: 'react_tease' }]],
      compromise: [[{ label: 'சின்ன வெற்றி!', value: 'react_win' }, { label: 'ரிப்பேருக்கு எவ்ளோ வேணும்?', value: 'react_ask' }]],
      save: [[{ label: 'சரியான நேரம்.', value: 'react_perfect' }, { label: 'பாரு, இதுக்குத்தான் சேமிக்கிறோம்.', value: 'react_lesson' }]],
    },
    midResolutionOptions: {
      spend: [{ label: 'அய்யோ, இப்போ என்ன பண்ணப் போற?', value: 'inquire_spend' }, { label: 'குறைந்தபட்சம் கூல் ஷூ இருக்கே?', value: 'joke_spend' }],
      compromise: [{ label: 'ரிப்பேர் பண்ண போதுமான பணம் மீதி இருக்கா?', value: 'inquire_comp' }, { label: 'உன் கருவிக்கு மோசமான நேரம்.', value: 'sympathy_comp' }],
      save: [{ label: 'கேட்டு வருத்தமா இருக்கு! நீ நல்லா இருக்கியா?', value: 'sympathy_save' }, { label: 'இப்போ என்ன பண்ணப் போற?', value: 'inquire_save' }],
    },
    postResolutionLine: {
      spend: 'இதை மாத்த சம்பளத்துக்கு காத்திருக்கணும். அதுவரைக்கும் அசைன்மென்ட் கூட பண்ண முடியாது. பாடம் கத்துக்கிட்டேன்.',
      compromise: 'நான் பாதி சேமிச்சதால, மாத்த *சரியா* போதுமான பணம் இருந்துச்சு. அது நெருங்கிய தப்பிப்பு!',
      save: 'நல்லவேளை, நான் எல்லாத்தையும் சேமிச்சதால, உடனே அமேசானில் ஒரு புதுசு வாங்கிட்டேன். முழு லைஃப்சேவர்.',
    },
    robotResolutionLine: {
      save: '🤖 குறிப்பு: இதுதான் அசல் ரகசியக் குறியீடு. ஒரு ஆதரவை வச்சிருக்கிறது பதற்றத்த சின்ன தொல்லையா மாத்தும்.',
      compromise: '🤖 குறிப்பு: பாதியா சேமிக்கிறதும் சேமிப்புதான். ஒரு சின்ன ஆதரவு பூஜ்ஜியத்த விட எவ்ளோவோ மேல்.',
      spend: '🤖 குறிப்பு: பணத்துக்கு ஆதரவே இல்லாதப்போ, ஒவ்வொரு சின்ன விபத்தும் பெரிய நிதி நெருக்கடியா மாறிடும்.',
    },
    takeawayLine: '💡 பாடம்: திடீர் கிடைக்கும் பணத்த ஒரு பணப்புழக்க ஆதரவால தான் சிறப்பா காப்பாத்த முடியும், ஒரு பகுதி பாதுகாப்பு வலை கூட எல்லாத்தையும் மாத்தும்னு நிரூபிக்கும்.',
    goodbyeOptions: [
      { label: 'எல்லாம் சரியா முடிஞ்சதுக்கு சந்தோஷம்! பிறகு பார்க்கலாம், ரியா.', value: 'close_warm' },
      { label: 'பாடம் கத்துக்கிட்டேன்! சீக்கிரம் பேசலாம்.', value: 'close_casual' },
    ],
  },

  arjun: {
    npcName: 'அர்ஜுன்',
    dilemmaLine: 'சம்பளம் இப்போதான் வந்துச்சு. வெறும் ஓடிட்டு இருக்கிறதுக்கு மேல யோசிக்க போதுமான பணம் இருக்கிற முதல் மாசம். என் நண்பர்களோட குரூப் டிரிப் புக்கிங் இன்னிக்கே மூடுது -- வேகமா முடிவு எடுக்கணும்.',
    options: [
      { label: '✈️ முழு தொகைக்கும் டிரிப் புக் பண்ணு', value: 'trip' },
      { label: '⚖️ சின்ன வெர்ஷன் புக் பண்ணு, கொஞ்சம் சேமி', value: 'compromise' },
      { label: '🏦 முதல்ல பணத்த ஒதுக்கி வை', value: 'save' },
    ],
    confirmQuestion: {
      trip: 'சரி, டிரிப் முழு தொகைக்கும் புக் ஆயிடுச்சு! சூப்பரா இருக்கும்.',
      compromise: 'சின்ன அளவு டிரிப் பண்றது பாதி மனசுல செய்யறது மாதிரி தோணுது. நான் முழுசா போகக் கூடாதுன்னு உறுதியா?',
      save: 'உறுதியா? அதாவது இன்னிக்கு முக்கிய குரூப் டிரிப்பை முழுசா தவறவிடணும்.',
    },
    robotHelpLine: {
      save: '💡 குறிப்பு: முதல்ல சேமிப்ப முடிவு பண்ணி, மீதிலயே வாழறது, மீதி இருக்குமான்னு நம்பிக்கை வச்சிருக்கிறதை விட மேல்.',
      compromise: '💡 குறிப்பு: அடிப்படையை பாதுகாக்கும்போது வேடிக்கைக்கு ஒரு நிலையான பங்க ஒதுக்குறது ரெண்டு இலக்கையும் உயிரோட வைக்கும்.',
    },
    purchaseConfirmedLine: {
      trip: 'புக் ஆயிடுச்சு! முழு டிரிப், எதுவும் விடல. என் கதைய கேட்டதுக்கு நன்றி — பார்க்கலாம்!',
      compromise: 'சின்ன டிரிப் புக் பண்ணிட்டேன், கொஞ்சம் சம்பளமும் வச்சேன். நன்றி — பிறகு பார்க்கலாம்!',
      save: 'சரி, இந்த தடவை டிரிப்ப தவிர்க்கிறேன் — பணம் அக்கவுன்ட்லயே இருக்கும். நன்றி! பார்க்கலாம்.',
    },
    spendDeclineLine: 'சரி, டிரிப் புக் ஆயிடுச்சு! நல்லா இருக்கும்.',
    resolutionLine: {
      trip: ['மச்சி, அந்த டிரிப்புக்கு முழுசா செலவு பண்ணதுக்கு வருத்தமா இருக்கு.', 'திங்கள்கிழமை வேலைக்கு போறதுக்கு முன்னாடியே என் ஃபோன் ஸ்க்ரீன் உடைஞ்சிடுச்சு, அதுக்கு பணமே இல்ல.'],
      compromise: ['சரி... நான் புக் பண்ண அந்த சின்ன டிரிப் ஞாபகமா? திங்கள்கிழமை வேலைக்கு முன்னாடியே என் ஃபோன் ஸ்க்ரீன் உடைஞ்சிடுச்சு.', 'நல்லவேளை புக் பண்றதுக்கு முன்னாடி சம்பளத்துல கொஞ்சம் வச்சிருந்தேன்.'],
      save: ['மோசமான கிஸ்மத் பத்தி பேசுனா -- திங்கள்கிழமை வேலைக்கு முன்னாடியே என் ஃபோன் ஸ்க்ரீன் உடைஞ்சிடுச்சு.', 'நல்லவேளை என் சம்பளத்த நான் இன்னும் தொடல.'],
    },
    resolveReactionOptions: {
      trip: [[{ label: 'அய்யோ, என்ன ஆச்சு?', value: 'react_ask' }, { label: 'எவ்ளோ மோசம்?', value: 'react_bad' }]],
      compromise: [[{ label: 'கொஞ்சம் வச்சிருந்தது நல்லதுதான்.', value: 'react_good' }, { label: 'இது போதுமா இருக்குமா?', value: 'react_enough' }]],
      save: [[{ label: 'சரியான நேரம்.', value: 'react_perfect' }, { label: 'முதல்ல சேமிக்கிறதுக்கு இதுதான் அர்த்தம்.', value: 'react_lesson' }]],
    },
    midResolutionOptions: {
      trip: [{ label: 'ஃபோன் இல்லாம வேலைய எப்படி பாப்ப?', value: 'inquire_trip' }, { label: 'இது ரொம்ப மோசமான நேரம்.', value: 'sympathy_trip' }],
      compromise: [{ label: 'ரிப்பேர் பில்ல கட்ட முடிஞ்சுதா?', value: 'inquire_comp' }, { label: 'அய்யோ, மோசமான நேரம்!', value: 'sympathy_comp' }],
      save: [{ label: 'இதை சுலபமா ரிப்பேர் பண்ண முடியுமா?', value: 'inquire_save' }, { label: 'இது ரொம்ப மன அழுத்தம்!', value: 'sympathy_save' }],
    },
    postResolutionLine: {
      trip: 'என் வேலை ஃபோனை ரிப்பேர் பண்ண ஒரு உறவினரிடம் கடன் வாங்கணும்னு ஆயிடுச்சு. டிரிப் முடிஞ்ச சந்தோஷத்த முழுசா கெடுத்துடுச்சு.',
      compromise: 'என் கொஞ்ச சேமிப்பு சரியான நேரத்துல ரிப்பேர் பில்ல கட்டிடுச்சு. உஃப், நெருங்கிய தப்பிப்பு.',
      save: 'ரிப்பேரை முழுசா என் சொந்த காசுல கட்டிட்டேன். நல்லவேளை என் முக்கிய சேமிப்பை தொடல.',
    },
    robotResolutionLine: {
      save: '🤖 குறிப்பு: இதுதான் யோசனை -- முதல்ல சேமிப்பை முடிவு பண்ணு, மீதி எல்லாம் தானா சரியாகும்.',
      compromise: '🤖 குறிப்பு: தானியங்கியா ஒதுக்கீடு அவசர பாதுகாப்ப இழக்காம வாழ்க்கைய அனுபவிக்க விடும்.',
      trip: '🤖 குறிப்பு: முழுசா சம்பளத்துக்கு-சம்பளம் வாழறது சாதாரண ரிப்பேரையும் கடன் அவசரமா மாத்திடும்.',
    },
    takeawayLine: '💡 பாடம்: முன்னாடியே பணத்த ஒதுக்கி முதல்ல உனக்கே செலுத்திக்கிறது, வேலை சம்பந்தமான திடீர் பிரச்சினைகள் உன் மன அமைதிய குலைக்காம பாதுகாக்கும்.',
    goodbyeOptions: [
      { label: 'நீ சரியா சமாளிச்சதுக்கு சந்தோஷம்! பிறகு பார்க்கலாம், அர்ஜுன்.', value: 'close_warm' },
      { label: 'புத்திசாலியா இரு. பாய்!', value: 'close_casual' },
    ],
  },

  meera: {
    npcName: 'மீரா',
    dilemmaLine: 'இந்த மாசம் நிஜமாவே நல்லா போச்சு, வழக்கத்த விட அதிக ஆர்டர்கள். ஒவ்வொரு மாசமும் இப்படி இருக்கணும். ஒரு சப்ளையர் இன்னிக்கு மட்டும் மொத்த மெட்டீரியல்ல தள்ளுபடி தர்றாரு.',
    options: [
      { label: '🛠️ கூடுதல் பணத்த அப்கிரேடுக்கு செலவு பண்ணு', value: 'upgrade' },
      { label: '⚖️ சின்ன பேட்ச் வாங்கு, மீதி சேமி', value: 'compromise' },
      { label: '💰 கூடுதல் பணத்த ஒதுக்கி வை', value: 'save' },
    ],
    confirmQuestion: {
      upgrade: 'முழு அப்கிரேட் பண்ணிட்டேன் -- பலன் கிடைக்கும்னு நம்புறேன்!',
      save: 'உறுதியா? முழு மொத்த தள்ளுபடி மறுபடி கிடைக்காது.',
      compromise: 'சின்ன ஆர்டர்னா அதிகபட்ச லாபத்த தவறவிடலாம். இது சரின்னு நினைக்கியா?',
    },
    robotHelpLine: {
      save: '💡 குறிப்பு: மீராவோட வருமானம் மாசாமாசம் நிலையா இல்ல -- அதனால ஆதரவே திட்டமா இருக்கணும்.',
      compromise: '💡 குறிப்பு: மொத்த தள்ளுபடிக்கும் பணப்புழக்கத்துக்கும் சமநிலை வளர்ச்சிய பாதுகாப்பா வைக்கும்.',
    },
    purchaseConfirmedLine: {
      upgrade: 'முழு அப்கிரேட் பண்ணிட்டேன்! பலன் கிடைக்கும்னு நம்புறேன். பேசினதுக்கு நன்றி — பார்க்கலாம்!',
      compromise: 'சின்ன பேட்ச் ஆர்டர் பண்ணிட்டேன், மீதி வச்சேன். இன்னொரு கருத்துக்கு நன்றி — பிறகு பார்க்கலாம்!',
      save: 'இப்போதைக்கு கூடுதல் பணத்த வச்சிருக்கேன். பேசினதுக்கு நன்றி — பார்க்கலாம்!',
    },
    spendDeclineLine: 'முழு அப்கிரேட் பண்ணிட்டேன் -- பலன் கிடைக்கும்னு நம்புறேன்!',
    resolutionLine: {
      save: ['இந்த மாசம் ஆர்டர்களே இல்லைனு சொல்லலாம். ஆனா வெள்ளிக்கிழமை வாடகை கட்டணும்.', 'நல்லவேளை அந்தக் கூடுதல் பணத்த செலவு பண்ணாம ஒதுக்கி வச்சேன்.'],
      compromise: ['இந்த மாசம் ஆர்டர்களே இல்லைனு சொல்லலாம். ஆனா வெள்ளிக்கிழமை வாடகை கட்டணும்.', 'நல்லவேளை எல்லாத்தையும் மொத்த ஆர்டர்ல போடல.'],
      upgrade: ['இந்த மாசம் ஆர்டர்களே இல்லைனு சொல்லலாம். ஆனா வெள்ளிக்கிழமை வாடகை கட்டணும்.', 'என் பணம் முழுசும் யாரும் வாங்காத சரக்குல சிக்கிக்கிடக்கு.'],
    },
    resolveReactionOptions: {
      save: [[{ label: 'அந்த ஆதரவு இப்பவே பலன் தர்றது.', value: 'react_buffer' }, { label: 'இது வாடகைக்கு போதுமா?', value: 'react_ask' }]],
      compromise: [[{ label: 'கொஞ்சம் வச்சது புத்திசாலித்தனம்.', value: 'react_smart' }, { label: 'வாடகை கட்ட முடியுமா?', value: 'react_ask' }]],
      upgrade: [[{ label: 'இது கஷ்டமான விஷயம்.', value: 'react_sympathy' }, { label: 'இப்போ என்ன பண்ணப் போற?', value: 'react_ask' }]],
    },
    midResolutionOptions: {
      save: [{ label: 'வாடகைக்கு போதுமான பணம் இருக்கா?', value: 'inquire_save' }, { label: 'தைரியமா இரு!', value: 'sympathy_save' }],
      compromise: [{ label: 'இந்த வாரம் வாடகை கட்ட முடியுமா?', value: 'inquire_comp' }, { label: 'மந்தமான மாசங்கள் கஷ்டம்தான்.', value: 'sympathy_comp' }],
      upgrade: [{ label: 'வாடகைய எப்படி கட்டப் போற?', value: 'inquire_up' }, { label: 'இது பயமுறுத்தும் நிலைமை.', value: 'sympathy_up' }],
    },
    postResolutionLine: {
      save: 'நல்லவேளை கொஞ்சம் வச்சிருந்தேன். மந்தமான மாசங்கள் வந்துகிட்டே இருக்கும் -- நான் முழுசா பாதுகாப்பா இருக்கேன்.',
      compromise: 'நான் ஒதுக்கி வச்ச பணம் சரக்கு காத்திருக்கும்போது வாடகைய பாதுகாப்பா கட்டிடுச்சு.',
      upgrade: 'வாடகை கட்ட அதிக வட்டி கடன் வாங்கணும்னு ஆயிடுச்சு. என் லாபம் முழுசும் போச்சு.',
    },
    robotResolutionLine: {
      save: '🤖 குறிப்பு: வருமானம் ஏத்த இறக்கமா இருக்கும்போது, பணப்புழக்க ஆதரவுதான் எல்லாத்தையும் நிலையா வைக்கும்.',
      compromise: '🤖 குறிப்பு: மாறுபடும் வருமானத்துக்கு கலப்பு பட்ஜெட் சரக்கு பொறியிலிருந்து காப்பாத்தும்.',
      upgrade: '🤖 குறிப்பு: பணப்புழக்க ஆதரவு இல்லாம பீக் மாசங்களில் அதிகமா முதலீடு பண்றது கடன் சுழற்சிய உருவாக்கும்.',
    },
    takeawayLine: '💡 பாடம்: முறையற்ற வருமானத்துக்கு, பணப்புழக்க ஆதரவை பராமரிக்கிறது ஒரு அத்தியாவசிய உயிர்வாழ் திட்டம், வெறும் சேமிப்பு தேர்வு மட்டும் இல்ல.',
    goodbyeOptions: [
      { label: 'நீ சமாளிச்ச விதத்துல பெருமைப்படுறேன்! பார்க்கலாம், மீரா.', value: 'close_warm' },
      { label: 'அடுத்த மாச ஆர்டர்களுக்கு வாழ்த்துக்கள்!', value: 'close_casual' },
    ],
  },

  vikram: {
    npcName: 'விக்ரம்',
    dilemmaLine: 'ஏய்! எனக்கு ₹10,000 போனஸ் கிடைச்சிருக்கு, ஆனா என் கிரெடிட் கார்டு பில் கட்டணும், ஜிம் மெம்பர்ஷிப் தானா ரினியூ ஆயிடுச்சு, என் நண்பர்கள் ஒரு பகட்டான வீக்எண்ட் டிரிப் திட்டமிடுறாங்க.',
    options: [
      { label: '💳 குறைந்தபட்ச பில் கட்டு & மீதி டிரிப்புல செலவு பண்ணு', value: 'reckless' },
      { label: '⚖️ முழு கார்டையும் தீர், டிரிப்ப தவிர், மீதி சேமி', value: 'balanced' },
      { label: '🏦 80%ஐ சின்ன FDல் லாக் பண்ணு, குறைந்தபட்ச கார்டு பில் கட்டு', value: 'stiff' },
    ],
    confirmQuestion: {
      reckless: 'டிரிப் புக், குறைந்தபட்சம் கட்டிட்டேன், விரல்களை மடிச்சு காத்திருக்கேன்!',
      balanced: 'முழு கார்டையும் தீர்த்து டிரிப்ப தவிர்க்கிறதா? இப்போ இது ரொம்ப கட்டுப்பாடா தோணுது. உறுதியா?',
      stiff: 'கிரெடிட் கார்டு பாதி கட்டாம பெரும்பாலான பணத்த லாக் பண்றதா? அதிக வட்டி ஏறிக்கிட்டே போகும்.',
    },
    robotHelpLine: {
      balanced: '💡 குறிப்பு: அதிக வட்டி கிரெடிட் கார்டு கடன் டிரிப் நினைவுகள விட வேகமா செல்வத்த அழிக்கும். முதல்ல கடனை தீர்க்கிறதுதான் முக்கியம்.',
      stiff: '💡 குறிப்பு: பணம் சேமிக்கிறது நல்லதுதான், ஆனா ஏறிக்கிட்டே போற கிரெடிட் கார்டு வட்டிய புறக்கணிச்சு குறைந்த-வருமான FDல பணத்த லாக் பண்றது தலைகீழா முடியும்.',
    },
    purchaseConfirmedLine: {
      reckless: 'டிரிப் புக், கார்டுல குறைந்தபட்சம் கட்டிட்டேன். விரல் மடிச்சு காத்திருக்கேன்! பிறகு பார்க்கலாம்!',
      balanced: 'கார்ட தீர்த்துட்டேன், இந்த தடவை டிரிப்ப தவிர்க்கிறேன். உண்மைய காட்டினதுக்கு நன்றி — பார்க்கலாம்!',
      stiff: 'பெரும்பாலானதை FD-ல லாக் பண்ணிட்டேன், குறைந்தபட்சம் கட்டிட்டேன். நன்றி — பிறகு பார்க்கலாம்!',
    },
    spendDeclineLine: 'டிரிப் புக், குறைந்தபட்சம் கட்டிட்டேன், விரல்களை மடிச்சு காத்திருக்கேன்!',
    resolutionLine: {
      balanced: ['கிரெடிட் கார்டை முழுசா தீர்த்துட்டேன், ஏறிக்கிட்டே போற வட்டி பொறியில இருந்து தப்பிச்சேன்.', 'இந்த மாசம் டிரிப் இல்ல, ஆனா தலைமேல கடனும் இல்ல.'],
      reckless: ['டிரிப் அருமையா இருந்துச்சு, ஆனா என் கிரெடிட் கார்டு வட்டி அடுத்த மாசம் பில்ல பெருசா ஏத்திடுச்சு.', 'குறைந்தபட்ச பேமெண்ட் அசல் தொகைய அரிதா தொடும்னு எனக்குத் தெரியல.'],
      stiff: ['குறைந்தபட்சம் மட்டும் கட்டினதால கிரெடிட் கார்டு அபராதம் கடுமையா இருந்துச்சு.', 'இதுல FD அந்த கூடுதல் வட்டிய கவர் பண்ண போதுமா கூட சம்பாதிக்கல.'],
    },
    resolveReactionOptions: {
      balanced: [[{ label: 'இதுதான் அசல் நிதி சுதந்திரம்.', value: 'react_freedom' }, { label: 'டிரிப்ப தவிர்த்தது சரியா?', value: 'react_ask' }]],
      reckless: [[{ label: 'உஃப், ஏறிக்கிட்டே போற வட்டி ரொம்ப கொடூரம்.', value: 'react_ouch' }, { label: 'எவ்ளோ கூடுதலா கட்டுற?', value: 'react_ask' }]],
      stiff: [[{ label: 'அப்போ FD அப்படி உதவல.', value: 'react_fd' }, { label: 'இது வேகமா தலைகீழா ஆயிடுச்சு.', value: 'react_backfire' }]],
    },
    midResolutionOptions: {
      balanced: [{ label: 'அசல் நிதி சுதந்திரம் இப்படித்தான் உருவாகும்!', value: 'praise_bal' }, { label: 'நச்சு கடனை தீர்த்தது புத்திசாலித்தனம்.', value: 'agree_bal' }],
      reckless: [{ label: 'உஃப், அந்த வட்டி ஏறுறது ரொம்ப கொடூரம்.', value: 'sympathy_rec' }, { label: 'டிரிப் அந்த கடனுக்கு லாயக்கா இருந்திருக்கும்னு நம்புறேன்.', value: 'joke_rec' }],
      stiff: [{ label: 'கிரெடிட் கார்டு APR விகிதங்களை ஒருபோதும் புறக்கணிக்காதே.', value: 'advice_stiff' }, { label: 'இது வேகமா தலைகீழா ஆயிடுச்சு.', value: 'sympathy_stiff' }],
    },
    postResolutionLine: {
      balanced: 'இப்போ என் தலைமேல கெட்ட கடன் ஏதும் இல்ல. முழு மன அமைதி.',
      reckless: 'இரண்டு நாள் சந்தோஷத்துக்காக ஆறு மாசம் பாரமான வட்டி கட்டினேன். இனிமே இப்படி பண்ண மாட்டேன்.',
      stiff: 'FDல சம்பாதிச்சதை விட வங்கி அபராதமா வாங்கிடுச்சு. ரெண்டு பக்கமும் நஷ்டம்.',
    },
    robotResolutionLine: {
      balanced: '🤖 குறிப்பு: அதிக வட்டி நச்சு கடனை அகற்றுவது கணிதப்படி உத்தரவாதமான, வரி-இல்லாத முதலீட்டு வருமானத்துக்கு சமம்.',
      reckless: '🤖 குறிப்பு: கிரெடிட் கார்டு பேமெண்ட்டை தள்ளிப்போடுறது குறுகிய கால சந்தோஷத்த நீண்டகால நிதி அடிமைத்தனமா மாத்தும்.',
      stiff: '🤖 குறிப்பு: பணப்புழக்க உத்தி எப்போதும் குறைந்த-வருமான சொத்துக்களை லாக் பண்றதுக்கு முன்னாடி அதிக-செலவு பொறுப்புகளுக்கு முன்னுரிமை தரணும்.',
    },
    takeawayLine: '💡 நிலை 2 பாடம்: அதிக வட்டி கடன் மேலாண்மை எப்போதும் விருப்ப வாழ்க்கை முறை செலவு அல்லது அவசர சொத்து லாக்கிங்க விட முன்னுரிமை பெறணும்.',
    goodbyeOptions: [
      { label: 'அற்புதமான செயல்பாடு! பிறகு பார்க்கலாம், விக்ரம்.', value: 'close_warm' },
      { label: 'பாடம் மனசுல பதிஞ்சிடுச்சு. பாய்!', value: 'close_casual' },
    ],
  },

  aahan: {
    npcName: 'ஆஹான்',
    dilemmaLine: 'பெரிய திருப்பம். நான் ₹1.5 லட்சம் சேமிச்சிருக்கேன். இதை முழுசா ட்ரெண்டிங் அதிக-ரிஸ்க் கிரிப்டோ/மீம் சொத்துல போடணுமா, இண்டெக்ஸ் ஃபண்ட் & கிரிப்டோவுக்கு பிரிக்கணுமா, இல்ல சந்தைய படிக்கிற வரைக்கும் பாதுகாப்பா ஒரு லிக்விட் டெட் ஃபண்ட்ல வைக்கணுமா?',
    options: [
      { label: '🚀 ட்ரெண்டிங் அதிக-ரிஸ்க் சொத்துல முழுசும் போடு', value: 'reckless' },
      { label: '⚖️ கலப்பு பிரிவு: 50% இண்டெக்ஸ் ஃபண்ட், 50% ஊகச் சொத்து', value: 'balanced' },
      { label: '🛡️ லிக்விட் டெட் ஃபண்ட்ல வை + கடுமையான மேக்ரோ ஆய்வு', value: 'save' },
    ],
    confirmQuestion: {
      reckless: 'ஒரு நிலையற்ற சொத்துல முழு FOMO மோடா? ஒரு மேக்ரோ சந்தை திருத்தம் ஒரே இரவுல 80%ஐ அழிக்கலாம். உறுதியா?',
      balanced: '50/50 பிரிவு பாதி மூலதனத்த கடுமையான ஏத்த இறக்கத்துக்கு ஆளாக்கும். இந்த ரிஸ்க் நிலை உனக்கு பரவாயில்லையா?',
      save: 'புல் ரன் நடக்கும்போது டெட் ஃபண்ட்ல முற்றிலும் பாதுகாப்பா விளையாடுறதா? பெரிய மூலதன ஆதாயத்த தவறவிடலாம். உறுதியா?',
    },
    robotHelpLine: {
      reckless: '💡 நிபுணர் குறிப்பு: ரிஸ்க்-மேலாண்மை கட்டமைப்பு அல்லது மூலதன பாதுகாப்பு உத்தி இல்லாம மொமெண்டத்த துரத்துறது முதலீடு இல்ல, ஊகம்.',
      balanced: '💡 நிபுணர் குறிப்பு: கலப்பு பல்வகைப்படுத்தல் முக்கிய மூலதனத்த பாதுகாக்கும்போது வளர்ச்சி பலனையும் பிடிக்கும், ஆனா சொத்து தொடர்பு முக்கியம்.',
      save: '💡 நிபுணர் குறிப்பு: அதிக பொருளாதார நிச்சயமற்ற தன்மையின்போது மூலதன பாதுகாப்புதான் முதல் முன்னுரிமை, ஆனா பணவீக்கத்தையும் சமாளிக்கணும்.',
    },
    purchaseConfirmedLine: {
      reckless: 'முழுசா இதுல போடுறேன் — என்ன ஆகுதுன்னு பாக்கலாம். பேசினதுக்கு நன்றி — பிறகு பார்க்கலாம்!',
      balanced: 'நீ சொன்ன மாதிரி 50/50 பிரிச்சிட்டேன். பார்வைக்கு நன்றி — பார்க்கலாம்!',
      save: 'சந்தைய படிக்கிற வரைக்கும் இதை பாதுகாப்பா வச்சிருக்கேன். நன்றி — பிறகு பார்க்கலாம்!',
    },
    spendDeclineLine: 'அதிக-ரிஸ்க் விளையாட்டுக்கு 100% உறுதி. என்ன ஆகுதுன்னு பார்க்கலாம்.',
    resolutionLine: {
      reckless: ['திடீர்னு ஒரு ஒழுங்குமுறை நடவடிக்கை பெரிய சந்தை ஃபிளாஷ் கிராஷை ஏற்படுத்திடுச்சு.', 'என் போர்ட்ஃபோலியோ மதிப்பு 4 மணி நேரத்துக்குள் 70% குறைஞ்சிடுச்சு, நான் பணப்புழக்கம் இல்லாம சிக்கிக்கிட்டேன்.'],
      balanced: ['இன்னிக்கு சந்தை கடுமையான சரிவை சந்திச்சுது.', 'என் இண்டெக்ஸ் ஃபண்ட் பங்கு நிலையா இருந்துச்சு, ஆனா ஊகப் பங்கு பெரிய அடி வாங்கிடுச்சு. குறைந்தபட்சம் என் அடிப்படை பாதுகாப்பா இருக்கு.'],
      save: ['எல்லா ஊக துறைகளிலும் சந்தை மோசமா கீழ போச்சு.', 'என் மூலதனம் பாதுகாப்பா லிக்விட் டெட் ஃபண்ட்ல இருந்ததால, நான் எந்த நஷ்டமும் இல்லாம முழுசா பத்திரமா வெளிவந்தேன்.'],
    },
    resolveReactionOptions: {
      reckless: [[{ label: 'இது ரொம்ப கொடூரம்.', value: 'react_brutal' }, { label: 'இதுல இருந்து மீள முடியுமா?', value: 'react_ask' }]],
      balanced: [[{ label: 'நீ பல்வகைப்படுத்தினது நல்லது.', value: 'react_good' }, { label: 'நஷ்டம் எவ்ளோ மோசம்?', value: 'react_ask' }]],
      save: [[{ label: 'பணப்புழக்கமா இருந்தது புத்திசாலித்தனம்.', value: 'react_smart' }, { label: 'சரிவுல வாங்கறதுக்கு சரியான நேரம்.', value: 'react_ask' }]],
    },
    midResolutionOptions: {
      reckless: [{ label: 'இதுதான் பாதுகாப்பில்லாத ஊகத்தின் கொடூர உண்மை.', value: 'advice_reck' }, { label: 'நீ வெளியேற முடியுமா இல்ல சிக்கிக்கிட்டியா?', value: 'inquire_reck' }],
      balanced: [{ label: 'பல்வகைப்படுத்தல் உன்ன முழு அழிவிலிருந்து காப்பாத்திடுச்சு.', value: 'praise_bal' }, { label: 'இப்போ மொத்த போர்ட்ஃபோலியோ எப்படி இருக்கு?', value: 'inquire_bal' }],
      save: [{ label: 'அசாத்தியமான மூலதன பாதுகாப்பு உத்தி!', value: 'praise_save' }, { label: 'இப்போ சரிவுல பாதுகாப்பா வாங்க உன்கிட்ட பணம் இருக்கு.', value: 'insight_save' }],
    },
    postResolutionLine: {
      reckless: 'நான் பதற்றமடைந்து மீதி இருந்ததை காப்பாத்த அடிமட்டத்துல வித்துட்டேன். வெறும் உணர்ச்சி வசப்பட்ட FOMO காரணமா மாசக்கணக்கான சேமிப்பு காணாம போச்சு.',
      balanced: 'கலப்பு உத்தி அதோட மதிப்ப நிரூபிச்சுது. நிலையான சொத்து அதிர்ச்சிய தாங்கிச்சு, வளர்ச்சி சொத்து காலப்போக்குல மீளும்.',
      save: 'என் மூலதனத்தோட ஒவ்வொரு ரூபாயையும் பாதுகாச்சேன். இப்போ மதிப்பீடுகள் விழுந்திருக்கும்போது, நான் புத்திசாலித்தனமா நல்ல சொத்துக்கள்ல பணத்த போட முடியும்.',
    },
    robotResolutionLine: {
      reckless: '🤖 நிபுணர் குறிப்பு: ஸ்டாப்-லாஸ் இல்லாம அதிக-நிலையற்ற உணர்ச்சி சொத்துக்கள்ல பாதுகாப்பில்லாம முதலீடு பண்றது பயங்கர நஷ்டத்துக்கு உத்தரவாதம்.',
      balanced: '🤖 குறிப்பு: கோர்-சாட்டலைட் சொத்து ஒதுக்கீடு நீண்டகால செல்வ வளர்ச்சிய கணக்கிட்ட உத்தி வளர்ச்சியோட சமன் பண்ணும்.',
      save: '🤖 குறிப்பு: உச்சபட்ச சந்தை மதிப்பீட்டின்போது பணப்புழக்க பாதுகாப்பு சிறந்த நிறுவன போர்ட்ஃபோலியோ மேலாண்மையின் அடையாளம்.',
    },
    takeawayLine: '💡 நிலை 3 நிபுணர் பாடம்: நீண்டகால செல்வ உருவாக்கம் ஒழுக்கமான சொத்து ஒதுக்கீடு, ரிஸ்க்-சரிசெய்யப்பட்ட வருமானம், ஊக நேரம் அல்லாம மூலதன பாதுகாப்பால தீர்மானிக்கப்படுது.',
    goodbyeOptions: [
      { label: 'ரிஸ்க் மேலாண்மையில மாஸ்டர்கிளாஸ். பார்க்கலாம், ஆஹான்!', value: 'close_warm' },
      { label: 'மதிப்புமிக்க சந்தை பாடம். பாய்!', value: 'close_casual' },
    ],
  },
}

const ADVISORY_TRANSLATIONS = { hi: ADVISORY_SCRIPTS_HI, ta: ADVISORY_SCRIPTS_TA }

export const getAdvisoryScript = (npcId, language) =>
  resolveLocalized(ADVISORY_SCRIPTS, ADVISORY_TRANSLATIONS, npcId, language)
export const getAdvisoryScripts = makeLocalizedDict(ADVISORY_SCRIPTS, ADVISORY_TRANSLATIONS)