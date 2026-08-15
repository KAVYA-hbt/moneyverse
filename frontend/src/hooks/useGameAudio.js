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
  // Applause/claps — for the Mayor badge-handoff moment. Noise bursts,
  // not tones (a real clap is percussive, not pitched) -- see the
  // `claps` branch in playRewardSound below.
  applause: { claps: [0, 0.14, 0.28, 0.42, 0.6, 0.78], clapDur: 0.09, gain: 0.3 },
  // Opening sting for the loading/crawl screen -- a lower, darker chord
  // than levelup's (this is an entrance, not a reward) with a longer,
  // wider sweep underneath for that "movie logo hit" swell.
  intro_sting: { chord: [130.81, 164.81, 196.0, 261.63], dur: 2.0, gain: 0.26, type: 'sawtooth', sweep: [80, 900] },
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
    // If ambience is mid-loop when the player mutes, stop it rather than
    // leaving it silently running until something else calls
    // stopAmbience(). stopAmbience is declared further down in this hook
    // -- referencing it here (not in the dependency array) is safe since
    // this effect only runs after the full hook body, including that
    // declaration, has executed once.
    if (isMuted) stopAmbience()
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted))
    } catch {
      // ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // A clap has no pitch -- it's a short burst of noise with a fast
    // decay, not a tone -- so this generates actual white noise into a
    // buffer (unlike pluckNote's oscillator above) and shapes it through
    // a bandpass filter to give it that percussive "clap" character
    // rather than sounding like static.
    const playClap = (startAt, dur, peakGain) => {
      const bufferSize = Math.max(1, Math.ceil(ctx.sampleRate * dur))
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      // Slight random shift per clap so a run of claps doesn't sound
      // like the exact same sample looping.
      filter.frequency.setValueAtTime(1700 + Math.random() * 900, now + startAt)
      filter.Q.value = 1.1

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now + startAt)
      gain.gain.linearRampToValueAtTime(peakGain, now + startAt + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.001, now + startAt + dur)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      noise.start(now + startAt)
      noise.stop(now + startAt + dur + 0.02)
    }

    if (config.claps) {
      config.claps.forEach((startAt) => playClap(startAt, config.clapDur, config.gain))
    } else if (config.chord) {
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

  // --- Loading-screen ambience (loop, unlike everything above which is
  // fire-and-forget) -------------------------------------------------
  // A slow, evolving low drone -- two detuned low oscillators (a fifth
  // apart) with a slow tremolo and an even slower filter sweep for
  // movement, so it doesn't sit static the whole time the crawl is up.
  // Kept in a ref (not state) since these are live audio nodes, not
  // data -- stopAmbience tears down exactly what startAmbience built.
  const ambienceRef = useRef(null)

  const startAmbience = useCallback(() => {
    if (isMuted) return
    const ctx = getAudioContext()
    if (!ctx) return
    if (ambienceRef.current) return // already running -- don't stack a second one

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, ctx.currentTime)
    master.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 1.2) // slow fade-in, not an abrupt start
    master.connect(ctx.destination)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 700
    filter.connect(master)

    // Slow filter sweep so the drone's tone color drifts over time
    // instead of sounding like a static pad.
    const filterLfo = ctx.createOscillator()
    const filterLfoGain = ctx.createGain()
    filterLfo.frequency.value = 0.05 // one full sweep roughly every 20s
    filterLfoGain.gain.value = 250
    filterLfo.connect(filterLfoGain)
    filterLfoGain.connect(filter.frequency)
    filterLfo.start()

    const oscFreqs = [65.41, 98.0] // low C and the fifth above it
    const oscs = oscFreqs.map((freq) => {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      const oscGain = ctx.createGain()
      oscGain.gain.value = 0.5
      osc.connect(oscGain)
      oscGain.connect(filter)
      osc.start()
      return osc
    })

    // Slow tremolo on the whole thing -- a gentle amplitude breathe
    // rather than a hard pulse.
    const tremolo = ctx.createOscillator()
    const tremoloGain = ctx.createGain()
    tremolo.frequency.value = 0.12
    tremoloGain.gain.value = 0.025
    tremolo.connect(tremoloGain)
    tremoloGain.connect(master.gain)
    tremolo.start()

    ambienceRef.current = { master, filter, filterLfo, oscs, tremolo, ctx }
  }, [isMuted, getAudioContext])

  const stopAmbience = useCallback(() => {
    const running = ambienceRef.current
    if (!running) return
    const { master, filterLfo, oscs, tremolo, ctx } = running
    const now = ctx.currentTime
    // Fade out over half a second rather than cutting off mid-drone.
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0, now + 0.5)
    setTimeout(() => {
      oscs.forEach((osc) => osc.stop())
      filterLfo.stop()
      tremolo.stop()
    }, 550)
    ambienceRef.current = null
  }, [])

  // Ambience must not keep playing after the component that started it
  // unmounts for any reason other than a clean stopAmbience() call.
  useEffect(() => () => stopAmbience(), [stopAmbience])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  return { isMuted, toggleMute, playSuccessSound, playRewardSound, startAmbience, stopAmbience }
}