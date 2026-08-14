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