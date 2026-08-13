// The 3 full advisory conversation scripts from the dialogue redesign
// spec — each one drives the SAME generic state machine (see
// useAdvisoryConversation.js): greeting -> options -> confirm ->
// [robot_help, loops back to confirm] -> resolve -> done.
//
// v3 changes:
//  - robotHelpLine ends by asking the player something back, so tapping
//    the robot icon is a real exchange, not a flat statement.
//  - robotResolutionLine ONLY plays if the player actually consulted the
//    robot this conversation. If they never asked, userInsightLine plays
//    instead — the SAME insight, but voiced as the player's own
//    realization, first-person, not credited to a robot that was never
//    invoked.
//  - The NPC conversation ends cleanly on the NPC's own thanks + the
//    player's own goodbye — it does NOT ask the player a further
//    question on the NPC's behalf (v2 tried this via
//    closingQuestion/spendFollowupQuestion and it read as an
//    out-of-place quiz tacked onto a short, natural exchange). Any
//    follow-up self-report now belongs to the ROBOT COMPANION instead,
//    as its own separate beat once this chat closes — see
//    fireSavingsHabitCheckin in GamePage.jsx / companionDialogue.js.
//
// This is intentionally NOT the old LLM-generated quiz flow — these are
// hand-written, specific to each NPC's real situation, matching the
// spec's "decision-support conversation, not a graded quiz" framing.
// There is no wrong answer at the option-picking stage; both choices
// lead somewhere real, and "No, let me think" always loops back rather
// than failing.

export const ADVISORY_SCRIPTS = {
  riya: {
    npcName: 'Riya',
    dilemmaLine: "Hey! I just got \u20b92,000 as a wedding gift. There's this pair of sneakers I've been wanting\u2026",
    options: [
      { label: '\ud83d\udecd\ufe0f Spend it now', value: 'spend' },
      { label: '\ud83d\udcb0 Save it', value: 'save' },
    ],
    confirmQuestion: { save: 'Are you sure? That means the sneakers wait.' },
    robotHelpLine: {
      save: "No wrong answer here \u2014 but money set aside now is still there if something comes up later, and sneakers won't be. Does that change anything for you?",
    },
    resolutionLine: {
      save: [
        "Ugh, group project \u2014 I need \u20b9400 by tomorrow and I almost didn't have it.",
        'Good thing I kept that back. Covered. That was close though.',
      ],
    },
    robotResolutionLine: {
      save: "That's the whole idea \u2014 keep a little back, and 'close calls' stop being emergencies.",
    },
    userInsightLine: {
      save: "Guess that's the whole point of keeping a little back \u2014 a close call stops being an emergency.",
    },
    npcThanksLine: { save: 'I made the save \u2014 and it actually paid off. Thank you!' },
    spendDeclineLine: "Okay \u2014 they're yours! Hope you love them.",
    signal: 'windfall_discipline',
    funnelLine: null,
  },

  arjun: {
    npcName: 'Arjun',
    dilemmaLine: "Salary just came in. First month I've actually got enough to think past just getting by. My friend's group trip booking closes today \u2014 need to decide fast.",
    options: [
      { label: '\u2708\ufe0f Book the trip, full amount', value: 'trip' },
      { label: '\ud83c\udfe6 Set money aside first', value: 'save' },
    ],
    confirmQuestion: { save: 'Are you sure? That means less for the trip right now.' },
    robotHelpLine: {
      save: 'Deciding your saving first, then living on the rest, tends to beat hoping there\u2019s something left over at the end. Want to try it this month, or play it by ear?',
    },
    resolutionLine: {
      save: [
        'My phone screen just cracked \u2014 need it fixed before Monday for work.',
        "I've got it covered. Good thing I didn't touch this.",
      ],
    },
    robotResolutionLine: {
      save: "That's the idea \u2014 decide it up front, and everything else takes care of itself.",
    },
    userInsightLine: {
      save: "Turns out deciding it up front is what actually made this easy \u2014 didn't even have to think twice.",
    },
    npcThanksLine: { save: 'Set it aside, needed it, had it. Thank you!' },
    spendDeclineLine: "Alright, trip's booked! Should be a good one.",
    signal: 'pay_yourself_first',
    funnelLine: "You just helped Arjun figure out paying himself first. Ever set that up for yourself?",
  },

  meera: {
    npcName: 'Meera',
    dilemmaLine: "This month's actually been great, way more orders than usual. Wish every month was like this. A supplier's offering bulk materials at a discount \u2014 only today.",
    options: [
      { label: '\ud83d\udee0\ufe0f Spend the extra on the upgrade', value: 'upgrade' },
      { label: '\ud83d\udcb0 Set the extra aside', value: 'save' },
    ],
    confirmQuestion: { save: "Are you sure? The discount won't come back." },
    robotHelpLine: {
      save: "Income like Meera's isn't steady month to month \u2014 so the buffer has to be the plan, not a bonus for good months only. Does the discount still feel worth it once you think of it that way?",
    },
    resolutionLine: {
      save: [
        'Barely any orders this month. Rent\u2019s due Friday though.',
        "Thank god I kept some back. Slow months happen \u2014 I'm covered.",
      ],
    },
    robotResolutionLine: {
      save: "When income moves around, the buffer's what keeps everything steady.",
    },
    userInsightLine: {
      save: "Guess when your income moves around like hers does, the buffer IS the plan \u2014 not a bonus for good months.",
    },
    npcThanksLine: { save: 'Made the call to hold back, and it worked out. Thank you!' },
    spendDeclineLine: 'Went for the upgrade \u2014 hope it pays off!',
    signal: 'buffer_building',
    funnelLine: "You just helped Meera build her buffer. Is your own income steady, or does it move around too?",
  },
}