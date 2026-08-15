// Companion dialogue beats — every line the companion (or an NPC/Mayor)
// says outside the repair/naming flow (which already has its own working
// cards in GamePage.jsx and isn't duplicated here). Each beat is a small,
// self-contained unit shown via useCompanionNarrative + CompanionDialogueModal.
//
// Shape of a beat:
// {
//   speaker: 'companion' | 'npc' | 'mayor',
//   lines: string[] | ((ctx) => string[]),   // shown one at a time, tap to advance
//   animation: 'death'|'wave'|'yes'|'no'|'walk'|'run'|'interact'|null,
//   options: [{ label: string, value: string }] | null, // ONLY on the final line
// }
//
// `ctx` passed to function-lines can include: companionName, playerName,
// questLabel, npcName — whatever the trigger site has on hand.

export const DIALOGUE_BEATS = {
  // ---- First-time proactive greeting (checklist item #5) ----
  // Fires once, ever, right after the narrator's onboarding lines finish
  // -- a real "the companion notices you and says hi" moment instead of
  // silence, using the player's own name (see GamePage.jsx's wiring).
  companion_first_greeting: {
    speaker: 'companion',
    animation: 'wave',
    lines: [
      (ctx) => `Hi ${ctx.playerName || 'there'}, hope you're doing well -- we've got a lot to explore today.`,
      "Want help finding someone? There's usually somebody nearby who could use it.",
    ],
  },

  // ---- Stage 2: First NPC quest ----
  first_quest_approach: {
    speaker: 'companion',
    animation: 'walk',
    lines: [
      "Someone over there needs help. Let's go.",
      (ctx) =>
        `They can't get anything done without ${ctx.questLabel || 'this'}. That's kind of our problem too, actually.`,
    ],
  },

  quest_success: {
    speaker: 'companion',
    animation: 'yes',
    lines: ["That's one more person who knows we exist. Small stuff. Still counts."],
  },

  quest_fail: {
    speaker: 'companion',
    animation: 'no',
    lines: ["Eh, happens. Want to try that one again?"],
  },

  // ---- Idle reminders — deliberately NOT once-ever like most story
  // narrator beats. Only for AFTER the companion is alive (companionPhase
  // 'done') — the pre-repair equivalents (companion_not_approaching /
  // companion_getting_close) live in narratorStory.js instead, since the
  // companion can't speak
  // about its own repair before it exists. ----
  // REPEATABLE, movement-aware — replaces the flat 60s idle check once
  // the companion is alive and quests are the current target.
  quest_not_approaching: {
    speaker: 'companion',
    animation: null,
    lines: [(ctx) => `Don't forget — ${ctx.questLabel || 'that task'}.`],
  },
  quest_getting_close: {
    speaker: 'companion',
    animation: 'yes',
    lines: [(ctx) => `Right up ahead — ${ctx.questLabel || 'this one'}.`],
  },

  // ---- Stage 3: Casual break (hunger) — NEEDS a hunger meter system to
  // trigger this automatically; not wired yet, see GamePage.jsx TODO. ----
  hunger_break_intro: {
    speaker: 'companion',
    animation: 'wave',
    lines: [
      "Okay, pause — I'm hungry, and I'm pretty sure you are too. Come on, there's a place near here.",
      "No finance stuff, promise. Just a quick game. I don't actually eat, for the record. But the vibe stands.",
    ],
  },

  hunger_break_success: {
    speaker: 'companion',
    animation: 'yes',
    lines: ["Nailed it. Refueled. Back to it whenever you're ready."],
  },

  // ---- Stage 4: NPC recognition — now wired via WanderingNPC's
  // position-reporting hook, see GamePage.jsx. ----
  npc_smalltalk_1: {
    speaker: 'npc',
    animation: null,
    lines: ["Just heading to the market — nice day for it."],
  },
  npc_smalltalk_2: {
    speaker: 'npc',
    animation: null,
    lines: ["Haven't seen you around before, have I?"],
  },
  npc_smalltalk_3: {
    speaker: 'npc',
    animation: null,
    lines: ["Busy day in this part of town today."],
  },

  // ---- Fixed story NPCs (Phase 3A) — clickable-only greeting, leading
  // into the same advisory quiz pipeline everything else uses. ----
  npc_greeting_arjun: {
    speaker: 'npc',
    animation: null,
    lines: ["Hey — I need help. Salary just came in and I don't know what to do with it before it's gone."],
    options: [
      { label: '🤝 Help Arjun', value: 'help' },
      { label: '👋 Not right now', value: 'decline' },
    ],
  },
  npc_greeting_riya: {
    speaker: 'npc',
    animation: null,
    lines: ["Can you help me out? I got some gift money and I keep going back and forth on what to do with it."],
    options: [
      { label: '🤝 Help Riya', value: 'help' },
      { label: '👋 Not right now', value: 'decline' },
    ],
  },
  npc_greeting_meera: {
    speaker: 'npc',
    animation: null,
    lines: ["This month's actually been great — way more orders than usual. Could use another pair of eyes on something, though."],
    options: [
      { label: '🤝 Help Meera', value: 'help' },
      { label: '👋 Not right now', value: 'decline' },
    ],
  },

  // ---- Advisory conversation (Phase 3B) — the ENTIRE "help this citizen"
  // exchange happens in this bottom dialogue bar, never a popup card.
  // The NPC states their dilemma (their spoken line is the actual quiz
  // question fetched from the backend, injected at runtime — see
  // GamePage.jsx's handleNpcAdvisory/presentAdvisoryOptions, which builds
  // these turns as dynamic beat objects rather than static entries here),
  // then their answer choices themselves become the next line's option
  // buttons. A wrong pick doesn't lock/fail — it removes that option and
  // loops back with what's left, so it reads as "let me think again," not
  // a graded quiz. `npc_thanks` and `npc_out_of_options` are the two ways
  // the conversation can end. ----
  npc_wrong_suggestion: {
    speaker: 'npc',
    animation: null,
    lines: ["Hmm, I don't think that's quite right for me — what about one of these instead?"],
  },

  npc_out_of_options: {
    speaker: 'npc',
    animation: null,
    lines: [
      "Okay, none of those feel right either. Maybe I need to sit with this a bit longer.",
      "Thanks for talking it through with me, anyway.",
    ],
  },

  npc_thanks: {
    speaker: 'npc',
    animation: 'yes',
    lines: [
      (ctx) => `Thanks, ${ctx.playerName || 'friend'} — that actually helps a lot.`,
      "I wouldn't have known where to start with that on my own.",
    ],
  },

  npc_recognition_first_time: {
    speaker: 'npc',
    animation: 'wave',
    lines: [
      (ctx) => `Hey — ${ctx.playerName || 'you'}, right? Heard you sorted out someone's account stuff. Nice work.`,
    ],
  },

  companion_reacts_to_recognition: {
    speaker: 'companion',
    animation: 'yes',
    lines: ["Wait, did they just say your name? That's — okay that's actually kind of a big deal. People are starting to know you."],
  },

  // ---- Stage 5: Mayor ceremony + product funneling — NEEDS a Mayor/King
  // NPC placed in the world and a "level climax quest" trigger; neither
  // exists yet. Check-in dialogue itself is ready to use once you have a
  // moment to fire it from (e.g. periodically, or once per level). ----
  mayor_ceremony: {
    speaker: 'mayor',
    animation: 'wave',
    lines: [(ctx) => `${ctx.playerName || 'Newcomer'}. Word travels fast in this city, and what I'm hearing about you is good. This is yours.`],
  },

  mayor_ceremony_companion_reaction: {
    speaker: 'companion',
    animation: 'wave',
    lines: ["Look at that. We actually did that."],
  },

  level_transition: {
    speaker: 'companion',
    animation: 'wave',
    lines: [(ctx) => `Okay, ${ctx.previousTitle || 'that'}'s officially not the word for you anymore. ${ctx.newTitle || 'New chapter'}. Let's see what that actually means.`],
  },

  product_funnel_checkin: {
    speaker: 'companion',
    animation: 'yes',
    lines: ["Real talk — ever thought about actually opening a savings account, instead of just holding onto cash?"],
    options: [
      { label: '🏦 Yeah, tell me more', value: 'yes' },
      { label: '👍 I\'m fine, honestly', value: 'decline' },
    ],
  },

  product_funnel_response_yes: {
    speaker: 'companion',
    animation: 'yes',
    lines: ["Good call — takes two minutes. Let's get you set up."],
  },
  product_funnel_response_decline: {
    speaker: 'companion',
    animation: 'no',
    lines: ["Totally fine. I'll drop it — for now."],
  },
}