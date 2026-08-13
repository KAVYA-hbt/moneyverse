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