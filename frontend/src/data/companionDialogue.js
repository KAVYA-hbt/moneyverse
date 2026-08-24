import { resolveLocalized, makeLocalizedDict } from '../i18n/dataLocalization.js'

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

// Hindi/Tamil overlays -- see dataLocalization.js. Only `lines`/`options`
// are ever translated (the id, speaker, animation, and option `value`s
// stay exactly as in DIALOGUE_BEATS, since those are read by code, not
// shown to the player).
const DIALOGUE_BEATS_HI = {
  companion_first_greeting: {
    lines: [
      (ctx) => `नमस्ते ${ctx.playerName || ''}, उम्मीद है सब ठीक है -- आज हमें बहुत कुछ खोजना है।`,
      'किसी को ढूंढने में मदद चाहिए? आस-पास आमतौर पर कोई न कोई होता है जिसे मदद चाहिए।',
    ],
  },
  first_quest_approach: {
    lines: [
      'वहाँ किसी को मदद चाहिए। चलो चलते हैं।',
      (ctx) => `${ctx.questLabel || 'यह'} के बिना उनका कोई काम नहीं हो पाएगा। सच कहूं तो यह हमारी भी समस्या है।`,
    ],
  },
  quest_success: { lines: ['एक और व्यक्ति जो हमें जानता है। छोटी बात है। फिर भी मायने रखती है।'] },
  quest_fail: { lines: ['अरे, होता है। फिर से कोशिश करना चाहोगे?'] },
  quest_not_approaching: { lines: [(ctx) => `मत भूलना — ${ctx.questLabel || 'वह काम'}।`] },
  quest_getting_close: { lines: [(ctx) => `बिल्कुल पास — ${ctx.questLabel || 'यह वाला'}।`] },
  hunger_break_intro: {
    lines: [
      'ठीक है, रुको — मुझे भूख लगी है, और शायद तुम्हें भी। चलो, यहाँ पास में एक जगह है।',
      'कोई फाइनेंस वाली बात नहीं, वादा। बस एक छोटा सा गेम। मैं असल में खाता नहीं हूं, बताने के लिए बता रहा हूं। पर बात वही है।',
    ],
  },
  hunger_break_success: { lines: ['हो गया। रिफ्यूल हो गया। जब तैयार हो, वापस काम पर।'] },
  npc_smalltalk_1: { lines: ['बस बाज़ार जा रहा हूं — इसके लिए अच्छा दिन है।'] },
  npc_smalltalk_2: { lines: ['तुम्हें पहले यहाँ आस-पास नहीं देखा, है ना?'] },
  npc_smalltalk_3: { lines: ['आज शहर के इस हिस्से में काफी हलचल है।'] },
  npc_greeting_arjun: {
    lines: ['अरे — मुझे मदद चाहिए। सैलरी आ गई है और पता नहीं इसका क्या करूं, इससे पहले कि यह खत्म हो जाए।'],
    options: [
      { label: '🤝 अर्जुन की मदद करें', value: 'help' },
      { label: '👋 अभी नहीं', value: 'decline' },
    ],
  },
  npc_greeting_riya: {
    lines: ['मेरी मदद कर सकते हो? मुझे कुछ गिफ्ट मनी मिली है और मैं तय नहीं कर पा रही कि इसका क्या करूं।'],
    options: [
      { label: '🤝 रिया की मदद करें', value: 'help' },
      { label: '👋 अभी नहीं', value: 'decline' },
    ],
  },
  npc_greeting_meera: {
    lines: ['इस महीने सच में बहुत अच्छा रहा है — हमेशा से ज़्यादा ऑर्डर। पर एक चीज़ में एक और राय चाहिए।'],
    options: [
      { label: '🤝 मीरा की मदद करें', value: 'help' },
      { label: '👋 अभी नहीं', value: 'decline' },
    ],
  },
  npc_wrong_suggestion: { lines: ['हम्म, मुझे लगता है यह मेरे लिए सही नहीं है — इनमें से कोई एक कैसा रहेगा?'] },
  npc_out_of_options: {
    lines: [
      'ठीक है, इनमें से भी कोई सही नहीं लग रहा। शायद मुझे थोड़ा और सोचना होगा।',
      'फिर भी, मेरे साथ इस बारे में बात करने के लिए शुक्रिया।',
    ],
  },
  npc_thanks: {
    lines: [
      (ctx) => `शुक्रिया, ${ctx.playerName || 'दोस्त'} — इससे सच में बहुत मदद मिली।`,
      'अकेले तो मुझे पता ही नहीं चलता कि कहाँ से शुरू करूं।',
    ],
  },
  npc_recognition_first_time: {
    lines: [(ctx) => `अरे — ${ctx.playerName || 'तुम'}, है ना? सुना है तुमने किसी के अकाउंट का काम सुलझाया। बढ़िया काम।`],
  },
  companion_reacts_to_recognition: {
    lines: ['रुको, क्या उन्होंने अभी तुम्हारा नाम लिया? यह — यह तो सच में बड़ी बात है। लोग अब तुम्हें जानने लगे हैं।'],
  },
  mayor_ceremony: {
    lines: [(ctx) => `${ctx.playerName || 'नवागंतुक'}। इस शहर में बात तेज़ी से फैलती है, और तुम्हारे बारे में जो सुन रहा हूं वह अच्छा है। यह तुम्हारा है।`],
  },
  mayor_ceremony_companion_reaction: { lines: ['देखो तो। हमने सच में यह कर दिखाया।'] },
  level_transition: {
    lines: [(ctx) => `ठीक है, ${ctx.previousTitle || 'वह'} अब तुम्हारे लिए सही शब्द नहीं रहा। ${ctx.newTitle || 'नया अध्याय'}। देखते हैं इसका असल मतलब क्या है।`],
  },
  product_funnel_checkin: {
    lines: ['सच में — कभी सोचा है असल में बचत खाता खोलने के बारे में, सिर्फ नकद रखने के बजाय?'],
    options: [
      { label: '🏦 हाँ, और बताओ', value: 'yes' },
      { label: '👍 मैं ठीक हूं, सच में', value: 'decline' },
    ],
  },
  product_funnel_response_yes: { lines: ['अच्छा फैसला — बस दो मिनट लगेंगे। चलो तुम्हें सेट अप करते हैं।'] },
  product_funnel_response_decline: { lines: ["कोई बात नहीं। मैं इसे अभी के लिए छोड़ देता हूं।"] },
}

const DIALOGUE_BEATS_TA = {
  companion_first_greeting: {
    lines: [
      (ctx) => `வணக்கம் ${ctx.playerName || ''}, நலமா இருக்கீங்கன்னு நம்பறேன் -- இன்னிக்கு நிறைய ஆராய வேண்டியிருக்கு.`,
      'யாருக்காவது உதவி தேடறீங்களா? பொதுவா அருகில் யாராவது இருப்பாங்க உதவி தேவைப்படறவங்க.',
    ],
  },
  first_quest_approach: {
    lines: [
      'அங்க ஒருத்தருக்கு உதவி தேவை. போலாம்.',
      (ctx) => `${ctx.questLabel || 'இது'} இல்லாம அவங்களால எதுவும் செய்ய முடியாது. உண்மையச் சொன்னா, இது நமக்கும் ஒரு பிரச்சினைதான்.`,
    ],
  },
  quest_success: { lines: ['நம்மள தெரிஞ்ச இன்னொருவர். சின்ன விஷயம்தான். ஆனா முக்கியம்தான்.'] },
  quest_fail: { lines: ['அய்யோ, நடக்கும். மறுபடியும் முயற்சி செய்யணுமா?'] },
  quest_not_approaching: { lines: [(ctx) => `மறக்காதீங்க — ${ctx.questLabel || 'அந்த வேலை'}.`] },
  quest_getting_close: { lines: [(ctx) => `நேரடியா முன்னாடி — ${ctx.questLabel || 'இது'}.`] },
  hunger_break_intro: {
    lines: [
      'சரி, நிறுத்து — எனக்கு பசிக்குது, உனக்கும் பசிக்குமுன்னு நினைக்கிறேன். வா, இங்க அருகில் ஒரு இடம் இருக்கு.',
      'பணம் சம்பந்தமா எதுவும் இல்ல, சத்தியமா. ஒரு சின்ன விளையாட்டு மட்டும். நான் உண்மையிலேயே சாப்பிட மாட்டேன், தெரியப்படுத்த சொல்றேன். ஆனா அதே உணர்வுதான்.',
    ],
  },
  hunger_break_success: { lines: ['செம. ரீஃபுவல் ஆகிடுச்சு. நீ தயாரா இருக்கும்போது திரும்பி வேலைக்கு போலாம்.'] },
  npc_smalltalk_1: { lines: ['சந்தைக்குப் போயிட்டு இருக்கேன் — இதற்கு நல்ல நாள்.'] },
  npc_smalltalk_2: { lines: ['உன்னை முன்னாடி இங்க பார்த்ததில்லையே, இல்லையா?'] },
  npc_smalltalk_3: { lines: ['இன்னிக்கு இந்தப் பகுதியில் நல்ல பரபரப்பு.'] },
  npc_greeting_arjun: {
    lines: ['ஏய் — எனக்கு உதவி வேணும். சம்பளம் வந்துடுச்சு, அது தீர்ந்துபோகுறதுக்கு முன்ன என்ன செய்யறதுன்னு தெரியல.'],
    options: [
      { label: '🤝 அர்ஜுனுக்கு உதவு', value: 'help' },
      { label: '👋 இப்போ வேண்டாம்', value: 'decline' },
    ],
  },
  npc_greeting_riya: {
    lines: ['எனக்கு உதவ முடியுமா? எனக்கு பரிசா கொஞ்சம் பணம் கிடைச்சிருக்கு, அதை என்ன செய்யறதுன்னு முடிவு செய்ய முடியல.'],
    options: [
      { label: '🤝 ரியாவுக்கு உதவு', value: 'help' },
      { label: '👋 இப்போ வேண்டாம்', value: 'decline' },
    ],
  },
  npc_greeting_meera: {
    lines: ['இந்த மாசம் நிஜமாவே நல்லா போச்சு — வழக்கத்தை விட அதிக ஆர்டர்கள். ஆனா ஒரு விஷயத்துல இன்னொரு கருத்து வேணும்.'],
    options: [
      { label: '🤝 மீராவுக்கு உதவு', value: 'help' },
      { label: '👋 இப்போ வேண்டாம்', value: 'decline' },
    ],
  },
  npc_wrong_suggestion: { lines: ['ம்ம், அது எனக்குச் சரியில்லைன்னு நினைக்கிறேன் — இதுல ஒண்ணு எப்படி இருக்கும்?'] },
  npc_out_of_options: {
    lines: [
      'சரி, இதுலயும் எதுவும் சரியா தோணல. இன்னும் கொஞ்சம் யோசிக்கணும் போல.',
      'இருந்தாலும், இதைப் பத்தி பேசினதுக்கு நன்றி.',
    ],
  },
  npc_thanks: {
    lines: [
      (ctx) => `நன்றி, ${ctx.playerName || 'நண்பா'} — இது நிஜமாவே பெரிய உதவியா இருந்தது.`,
      'தனியா இருந்தா எங்க ஆரம்பிக்கிறதுன்னே தெரிஞ்சிருக்காது.',
    ],
  },
  npc_recognition_first_time: {
    lines: [(ctx) => `ஏய் — ${ctx.playerName || 'நீ'}தானே? யாருக்கோ அக்கவுன்ட் விஷயத்த சரி பண்ணி கொடுத்தேன்னு கேள்விப்பட்டேன். சூப்பர் வேலை.`],
  },
  companion_reacts_to_recognition: {
    lines: ['ஏய், அவங்க இப்போ உன் பேர சொன்னாங்களா? அது — அது நிஜமாவே பெரிய விஷயம். மக்கள் இப்போ உன்ன தெரிஞ்சுக்க ஆரம்பிச்சிருக்காங்க.'],
  },
  mayor_ceremony: {
    lines: [(ctx) => `${ctx.playerName || 'புதியவரே'}. இந்த நகரத்துல செய்தி வேகமா பரவும், உன்னைப் பத்தி நான் கேக்குறது நல்லதா இருக்கு. இது உன்னுடையது.`],
  },
  mayor_ceremony_companion_reaction: { lines: ['அதைப் பாரு. நாம நிஜமாவே அதைச் செஞ்சுட்டோம்.'] },
  level_transition: {
    lines: [(ctx) => `சரி, ${ctx.previousTitle || 'அது'} இனிமேல் உனக்கான வார்த்தை இல்ல. ${ctx.newTitle || 'புதிய அத்தியாயம்'}. அதோட அர்த்தம் என்னன்னு பார்க்கலாம்.`],
  },
  product_funnel_checkin: {
    lines: ['உண்மையிலேயே — பணத்தை வெறுமனே வச்சிருக்கிறதுக்கு பதிலா, சேமிப்புக் கணக்கு திறக்கிறது பத்தி யோசிச்சிருக்கியா?'],
    options: [
      { label: '🏦 ஆமா, மேலும் சொல்லு', value: 'yes' },
      { label: '👍 நான் நல்லா இருக்கேன், உண்மையா', value: 'decline' },
    ],
  },
  product_funnel_response_yes: { lines: ['நல்ல முடிவு — இரண்டு நிமிடம் மட்டும் ஆகும். உன்னை அமைக்கலாம்.'] },
  product_funnel_response_decline: { lines: ['பரவாயில்லை. இப்போதைக்கு இதை விட்டுடறேன்.'] },
}

const DIALOGUE_TRANSLATIONS = { hi: DIALOGUE_BEATS_HI, ta: DIALOGUE_BEATS_TA }

export const getDialogueBeats = makeLocalizedDict(DIALOGUE_BEATS, DIALOGUE_TRANSLATIONS)
export function getDialogueBeat(id, language) {
  return resolveLocalized(DIALOGUE_BEATS, DIALOGUE_TRANSLATIONS, id, language)
}