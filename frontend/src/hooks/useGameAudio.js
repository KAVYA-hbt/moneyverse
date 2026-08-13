import { useRef, useState, useEffect, useCallback } from 'react'

const MUTE_STORAGE_KEY = 'sbi_questcraft_audio_muted'

// Reward cues are synthesized with WebAudio instead of shipped as files —
// there's only bgm.mp3 in public/audio, and the previous "success sound"
// was actually just replaying the BGM track itself (same URL passed for
// both params below). Each tier is a short note sequence so different
// reward moments read as different weights of "exciting" without needing
// any new binary assets.
const REWARD_TIERS = {
  // Frequent, low-stakes pickups (world coins) — quick and quiet so it
  // doesn't wear out its welcome.
  coin: { notes: [[1318.5, 0], [1760, 0.06]], noteDur: 0.09, gain: 0.16, type: 'triangle' },
  // Default: quest / NPC-advisory completion.
  quest: { notes: [[523.25, 0], [659.25, 0.09], [783.99, 0.18]], noteDur: 0.16, gain: 0.22, type: 'sine' },
  // Mini-game clear — same shape as 'quest' plus a topping note.
  minigame: { notes: [[523.25, 0], [659.25, 0.08], [783.99, 0.16], [1046.5, 0.26]], noteDur: 0.15, gain: 0.24, type: 'sine' },
  // Capstone — a full chord swell instead of a single-line arpeggio.
  capstone: { chord: [523.25, 659.25, 783.99, 1046.5], dur: 0.9, gain: 0.22, type: 'sine' },
  // Level up — the biggest moment; chord swell plus a rising sweep on top.
  levelup: { chord: [523.25, 659.25, 987.77], dur: 1.1, gain: 0.24, type: 'sine', sweep: [400, 1600] },
}

export function useGameAudio(bgmUrl) {
  const bgmRef = useRef(null)
  const audioCtxRef = useRef(null)

  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // 1. Initialize BGM
  useEffect(() => {
    const bgm = new Audio(bgmUrl)
    bgm.loop = true
    bgm.volume = 0.35
    bgmRef.current = bgm

    return () => {
      bgm.pause()
      bgm.src = '' // Frees up browser memory/network
      bgmRef.current = null
    }
  }, [bgmUrl])

  // 2. Sync Mute State
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = isMuted
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted))
    } catch {
      // ignore storage errors
    }
  }, [isMuted])

  // 3. The Play Logic
  const tryStartBgm = useCallback(() => {
    if (!bgmRef.current) return

    // Replace startedRef with the built-in .paused check
    if (!bgmRef.current.paused) return

    bgmRef.current.play().catch(() => {
      // Still blocked by browser — wait for the fallback listeners
    })
  }, [])

  // 4. Attach Listeners
  useEffect(() => {
    tryStartBgm()

    const onFirstInteraction = () => {
      tryStartBgm()
    }

    window.addEventListener('click', onFirstInteraction)
    window.addEventListener('keydown', onFirstInteraction)
    window.addEventListener('touchstart', onFirstInteraction)

    return () => {
      window.removeEventListener('click', onFirstInteraction)
      window.removeEventListener('keydown', onFirstInteraction)
      window.removeEventListener('touchstart', onFirstInteraction)
    }
  }, [tryStartBgm])

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    if (!audioCtxRef.current) audioCtxRef.current = new Ctor()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
    return audioCtxRef.current
  }, [])

  useEffect(() => () => {
    audioCtxRef.current?.close?.().catch(() => {})
  }, [])

  const playRewardSound = useCallback((tier = 'quest') => {
    if (isMuted) return
    const ctx = getAudioContext()
    if (!ctx) return
    const config = REWARD_TIERS[tier] || REWARD_TIERS.quest
    const now = ctx.currentTime

    const pluckNote = (freq, startAt, dur, peakGain) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = config.type
      osc.frequency.setValueAtTime(freq, now + startAt)
      gain.gain.setValueAtTime(0, now + startAt)
      gain.gain.linearRampToValueAtTime(peakGain, now + startAt + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, now + startAt + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + startAt)
      osc.stop(now + startAt + dur + 0.05)
    }

    if (config.chord) {
      config.chord.forEach((freq) => pluckNote(freq, 0, config.dur, config.gain / config.chord.length + 0.03))
      if (config.sweep) {
        const [from, to] = config.sweep
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(from, now)
        osc.frequency.exponentialRampToValueAtTime(to, now + config.dur * 0.8)
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(0.05, now + 0.08)
        gain.gain.exponentialRampToValueAtTime(0.001, now + config.dur)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + config.dur + 0.05)
      }
    } else {
      config.notes.forEach(([freq, startAt]) => pluckNote(freq, startAt, config.noteDur, config.gain))
    }
  }, [isMuted, getAudioContext])

  // Back-compat name used by most existing call sites — 'quest' tier.
  const playSuccessSound = useCallback(() => playRewardSound('quest'), [playRewardSound])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  return { isMuted, toggleMute, playSuccessSound, playRewardSound }
}
