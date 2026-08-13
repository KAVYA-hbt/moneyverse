// The Narrator explains the STORY — the overarching premise and each
// level's meaning — never quest mechanics, never guidance on where to go
// (that's the companion's job, but only once it's actually alive). Third-
// person, omniscient, no speaker name attached. Most beats show once per
// player, ever — a couple (marked below) are deliberately repeatable.

export const NARRATOR_BEATS = {
  intro: {
    lines: [
      "This city doesn't know your name yet — but something small, locked, and waiting for you does. Check your map and go find it.",
    ],
  },

  // Fires once, the first time the player actually reaches the companion
  // — a proximity-triggered reaction, not a start-of-game one. The
  // companion itself can't speak yet, so this stays the Narrator's line.
  companion_found_reaction: {
    lines: ["Ohh — it looks like it's locked up tight. Better figure out how to unlock it."],
  },

  // REPEATABLE — movement-aware nudges while the companion is still
  // locked. Narrator voice, since the companion can't comment on its own
  // unlocking before it's awake.
  // lines as a function receives { avatarName } context so the resume
  // nudge can call the player by their chosen avatar name instead of a
  // generic line — falls back to "you" if no name was passed in, so a
  // call site that forgets the context still renders something real
  // rather than tripping the empty-content guard above.
  companion_not_approaching: {
    lines: (ctx) => [`${ctx?.avatarName || 'You'}, your companion's still out there.`],
  },
  companion_getting_close: {
    lines: (ctx) => [`Getting close now, ${ctx?.avatarName || 'friend'}.`],
  },

  level_1_start: {
    lines: [
      "This city runs on trust, and right now, it has none for you.",
      "Every document, every account, every small errand — it's all proof that you're real here.",
    ],
  },

  level_2_start: {
    lines: [
      "You're not invisible anymore. People let you run their errands now.",
      "Understanding how the city actually moves — that's the next thing to earn.",
    ],
  },

  level_3_start: {
    lines: [
      "Something's shifted. People aren't just handing you tasks anymore — they're asking your opinion.",
      "That's what trust sounds like, once it's actually been earned.",
    ],
  },

  level_4_start: {
    lines: [
      "Not every problem in this city is an errand. Some of them are threats.",
      "The people who trust you now expect you to help protect what they've built.",
    ],
  },

  level_5_start: {
    lines: [
      "You were a stranger once. Nobody here remembers that version of you anymore.",
      "What's left is bigger than errands — it's other people's futures, placed in your hands.",
    ],
  },
}