import { makeLocalizedDict } from '../i18n/dataLocalization.js'

// First-visit-only spotlight tour — 4 steps, shown once ever, before the
// story narration begins. Deliberately short (unlike the old 13-step
// per-HUD-element walkthrough this replaces) — same content as
// GuidePanel.jsx's on-demand reference, just previewed once with a
// spotlight so a new player actually notices it exists.

export const INTRO_TOUR_STEPS = [
  {
    id: 'profile',
    targetId: 'profile',
    icon: '👤',
    title: 'Your Profile',
    text: 'Top-left — tap it to see your profile or switch users.',
  },
  {
    id: 'top_bar',
    targetId: 'top_bar',
    icon: '📊',
    title: 'The Top Bar',
    text: 'Scenario, level, coins, tasks, streak, freezers, hint scrolls, and Trust — all live, updating as you play.',
  },
  {
    id: 'on_computer',
    targetId: null,
    icon: '💻',
    title: 'On Computer',
    text: 'WASD to move, E to interact, Esc to close a menu.',
  },
  {
    id: 'on_mobile',
    targetId: null,
    icon: '📱',
    text: 'Joystick (bottom-left) to move, the button (bottom-right) to interact, and Map & Tasks toggles the info panel.',
    title: 'On Mobile',
  },
]

const STEPS_BY_ID = Object.fromEntries(INTRO_TOUR_STEPS.map((s) => [s.id, s]))

const INTRO_TOUR_STEPS_HI = {
  profile: { title: 'आपकी प्रोफ़ाइल', text: 'ऊपर-बाईं ओर — अपनी प्रोफ़ाइल देखने या उपयोगकर्ता बदलने के लिए टैप करें।' },
  top_bar: { title: 'टॉप बार', text: 'स्थिति, स्तर, सिक्के, कार्य, स्ट्रीक, फ्रीज़र, संकेत स्क्रॉल, और भरोसा — सब लाइव, खेलते समय अपडेट होते हुए।' },
  on_computer: { title: 'कंप्यूटर पर', text: 'चलने के लिए WASD, इंटरैक्ट के लिए E, मेनू बंद करने के लिए Esc।' },
  on_mobile: { title: 'मोबाइल पर', text: 'चलने के लिए जॉयस्टिक (नीचे-बाएं), इंटरैक्ट के लिए बटन (नीचे-दाएं), और मैप व कार्य जानकारी पैनल टॉगल करता है।' },
}
const INTRO_TOUR_STEPS_TA = {
  profile: { title: 'உங்கள் சுயவிவரம்', text: 'மேல்-இடது — உங்கள் சுயவிவரத்தைப் பார்க்கவோ பயனரை மாற்றவோ தட்டவும்.' },
  top_bar: { title: 'மேல் பட்டை', text: 'சூழ்நிலை, நிலை, நாணயங்கள், பணிகள், தொடர்ச்சி, ஃப்ரீசர்கள், குறிப்பு சுருள்கள், நம்பிக்கை — அனைத்தும் நேரடியாக, விளையாடும்போது புதுப்பிக்கப்படுகின்றன.' },
  on_computer: { title: 'கணினியில்', text: 'நகர WASD, தொடர்பு கொள்ள E, மெனுவை மூட Esc.' },
  on_mobile: { title: 'மொபைலில்', text: 'நகர ஜாய்ஸ்டிக் (கீழ்-இடது), தொடர்பு கொள்ள பொத்தான் (கீழ்-வலது), மேப் & பணிகள் தகவல் பலகத்தை மாற்றும்.' },
}
const INTRO_TOUR_TRANSLATIONS = { hi: INTRO_TOUR_STEPS_HI, ta: INTRO_TOUR_STEPS_TA }

export function getIntroTourSteps(language = 'en') {
  const localizedById = makeLocalizedDict(STEPS_BY_ID, INTRO_TOUR_TRANSLATIONS)(language)
  return INTRO_TOUR_STEPS.map((step) => localizedById[step.id] || step)
}