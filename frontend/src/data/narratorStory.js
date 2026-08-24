import { resolveLocalized, makeLocalizedDict } from '../i18n/dataLocalization.js'

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

const NARRATOR_BEATS_HI = {
  intro: {
    lines: ['यह शहर अभी तुम्हारा नाम नहीं जानता — पर कुछ छोटा, बंद, और तुम्हारा इंतज़ार करता हुआ ज़रूर जानता है। अपना मैप देखो और उसे ढूंढो।'],
  },
  companion_found_reaction: {
    lines: ['ओह — यह तो अच्छी तरह बंद लग रहा है। इसे खोलने का तरीका ढूंढना बेहतर होगा।'],
  },
  companion_not_approaching: {
    lines: (ctx) => [`${ctx?.avatarName || 'तुम'}, तुम्हारा साथी अभी भी वहीं बाहर है।`],
  },
  companion_getting_close: {
    lines: (ctx) => [`अब पास आ रहे हो, ${ctx?.avatarName || 'दोस्त'}।`],
  },
  level_1_start: {
    lines: [
      'यह शहर भरोसे पर चलता है, और अभी, तुम पर इसका कोई भरोसा नहीं है।',
      'हर दस्तावेज़, हर खाता, हर छोटा काम — यह सब सबूत है कि तुम यहाँ असली हो।',
    ],
  },
  level_2_start: {
    lines: [
      'अब तुम अदृश्य नहीं हो। लोग अब तुमसे अपने काम करवाते हैं।',
      'यह समझना कि यह शहर असल में कैसे चलता है — वह अगली चीज़ है जो कमानी है।',
    ],
  },
  level_3_start: {
    lines: [
      'कुछ बदल गया है। लोग अब सिर्फ तुम्हें काम नहीं सौंप रहे — वे तुम्हारी राय पूछ रहे हैं।',
      'भरोसा कमाए जाने पर ऐसा ही लगता है।',
    ],
  },
  level_4_start: {
    lines: [
      'इस शहर की हर समस्या एक छोटा काम नहीं है। कुछ असल खतरे हैं।',
      'जो लोग अब तुम पर भरोसा करते हैं, वे उम्मीद करते हैं कि तुम उनकी बनाई चीज़ों की रक्षा करने में मदद करोगे।',
    ],
  },
  level_5_start: {
    lines: [
      'कभी तुम एक अजनबी थे। अब यहाँ कोई तुम्हारा वह रूप याद नहीं रखता।',
      'जो बचा है वह छोटे-मोटे कामों से कहीं बड़ा है — यह दूसरों का भविष्य है, जो तुम्हारे हाथों में सौंपा गया है।',
    ],
  },
}

const NARRATOR_BEATS_TA = {
  intro: {
    lines: ['இந்த நகரத்திற்கு உன் பேர் இன்னும் தெரியாது — ஆனா சின்னதா, பூட்டி, உனக்காக காத்திருக்கும் ஒன்று தெரியும். உன் மேப்பைப் பாத்து அதைப் போய் கண்டுபிடி.'],
  },
  companion_found_reaction: {
    lines: ['ஓ — இது இறுக்கமா பூட்டியிருக்கு போல. இதை எப்படி திறக்கிறதுன்னு யோசிக்கிறது நல்லது.'],
  },
  companion_not_approaching: {
    lines: (ctx) => [`${ctx?.avatarName || 'நீ'}, உன் துணை இன்னும் அங்கேயே இருக்கு.`],
  },
  companion_getting_close: {
    lines: (ctx) => [`இப்போ பக்கத்துல வந்துடிச்சு, ${ctx?.avatarName || 'நண்பா'}.`],
  },
  level_1_start: {
    lines: [
      'இந்த நகரம் நம்பிக்கையில் இயங்குது, இப்போதைக்கு, உன்மேல அதுக்கு நம்பிக்கை இல்ல.',
      'ஒவ்வொரு ஆவணமும், ஒவ்வொரு கணக்கும், ஒவ்வொரு சின்ன வேலையும் — நீ இங்க நிஜமா இருக்கேன்னு ஆதாரம்.',
    ],
  },
  level_2_start: {
    lines: [
      'நீ இனிமேல் கண்ணுக்குத் தெரியாதவன் இல்ல. மக்கள் இப்போ உன்கிட்ட தங்க வேலைகளை செய்ய வைக்கிறாங்க.',
      'இந்த நகரம் உண்மையில எப்படி இயங்கும்னு புரிஞ்சுக்கிறது — அதுதான் அடுத்து சம்பாதிக்க வேண்டியது.',
    ],
  },
  level_3_start: {
    lines: [
      'ஏதோ மாறியிருக்கு. மக்கள் இப்போ வெறும் வேலைகளை மட்டும் தரல — உன் கருத்தையும் கேக்குறாங்க.',
      'நம்பிக்கை சம்பாதிக்கப்படும்போது இப்படித்தான் இருக்கும்.',
    ],
  },
  level_4_start: {
    lines: [
      'இந்த நகரத்துல எல்லா பிரச்சினையும் ஒரு சின்ன வேலை இல்ல. சில அச்சுறுத்தல்கள்.',
      'இப்போ உன்ன நம்பற மக்கள், அவங்க கட்டி எழுப்பினதைப் பாதுகாக்க நீ உதவணும்னு எதிர்பாக்குறாங்க.',
    ],
  },
  level_5_start: {
    lines: [
      'ஒரு காலத்துல நீ அந்நியனா இருந்த. இப்போ இங்க யாருக்கும் அந்த உன்ன ஞாபகம் இல்ல.',
      'மிச்சம் இருக்கிறது சின்ன வேலைகளை விட பெரியது — அது மத்தவங்களோட எதிர்காலம், உன் கைகளில் ஒப்படைக்கப்பட்டிருக்கு.',
    ],
  },
}

const NARRATOR_TRANSLATIONS = { hi: NARRATOR_BEATS_HI, ta: NARRATOR_BEATS_TA }

export const getNarratorBeats = makeLocalizedDict(NARRATOR_BEATS, NARRATOR_TRANSLATIONS)
export function getNarratorBeat(id, language) {
  return resolveLocalized(NARRATOR_BEATS, NARRATOR_TRANSLATIONS, id, language)
}