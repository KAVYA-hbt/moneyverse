import { useEffect, useRef } from 'react'

const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'turnLeft',
  ArrowLeft: 'turnLeft',
  KeyD: 'turnRight',
  ArrowRight: 'turnRight',
}

export function useKeyboardMovement() {
  // turnRate is now continuous (-1..1), held-key based — same shape as
  // forward — instead of a one-shot discrete-tap queue. This is what lets
  // A/D actually rotate the camera smoothly while held, matching how
  // mouse-drag and mobile touch-look already behave in PlayerController.
  const stateRef = useRef({ forward: 0, turnRate: 0, run: false })
  const heldKeys = useRef(new Set())

  useEffect(() => {
    const updateContinuous = () => {
      let forward = 0
      if (heldKeys.current.has('forward')) forward += 1
      if (heldKeys.current.has('backward')) forward -= 1

      let turnRate = 0
      if (heldKeys.current.has('turnLeft')) turnRate += 1
      if (heldKeys.current.has('turnRight')) turnRate -= 1

      stateRef.current = { ...stateRef.current, forward, turnRate }
    }

    const handleKeyDown = (e) => {
      // Prevent browser scrolling
      if (e.code.startsWith('Arrow') || e.code === 'Space') {
        e.preventDefault()
      }

      if (e.code === 'Space') {
        stateRef.current = { ...stateRef.current, run: true }
        return
      }

      const action = KEY_MAP[e.code]
      if (!action) return

      heldKeys.current.add(action)
      updateContinuous()
    }

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        stateRef.current = { ...stateRef.current, run: false }
        return
      }

      const action = KEY_MAP[e.code]
      if (!action) return

      heldKeys.current.delete(action)
      updateContinuous()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // NOTE: mobile touch input is handled entirely inside PlayerController.jsx
  // via its own mv-forward / mv-strafe / mv-run / mv-look listeners — this
  // hook is keyboard-only, nothing else should read/write stateRef from
  // outside this file.

  return { stateRef }
}