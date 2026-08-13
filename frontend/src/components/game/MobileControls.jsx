import { useRef, useState, useCallback } from 'react'
import './MobileControls.css'

const JOYSTICK_MAX_RADIUS = 45

export function MobileControls({ onInteract, showInteract, interactLabel }) {
  const baseRef = useRef(null)
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 })
  const joystickDraggingRef = useRef(false)
  const joystickTouchIdRef = useRef(null)
  const [isRunning, setIsRunning] = useState(false)

  // Look Zone Tracking
  const isLookingRef = useRef(false)
  const lookTouchIdRef = useRef(null)
  const lastLookPosRef = useRef({ x: 0, y: 0 })

  const dispatchForward = (value) => {
    window.dispatchEvent(new CustomEvent('mv-forward', { detail: value }))
  }
  const dispatchStrafe = (value) => {
    window.dispatchEvent(new CustomEvent('mv-strafe', { detail: value }))
  }
  const dispatchRun = (value) => {
    window.dispatchEvent(new CustomEvent('mv-run', { detail: value }))
  }
  const dispatchLook = (deltaX, deltaY) => {
    window.dispatchEvent(new CustomEvent('mv-look', { detail: { deltaX, deltaY } }))
  }

  /* ================= LEFT THUMB: JOYSTICK (360° MOVEMENT) ================= */
  const handleJoystickStart = useCallback(() => {
    joystickDraggingRef.current = true
  }, [])

  const handleJoystickMove = useCallback((clientX, clientY) => {
    if (!joystickDraggingRef.current || !baseRef.current) return
    const rect = baseRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    let dx = clientX - centerX
    let dy = clientY - centerY
    const dist = Math.hypot(dx, dy)

    if (dist > JOYSTICK_MAX_RADIUS) {
      const scale = JOYSTICK_MAX_RADIUS / dist
      dx *= scale
      dy *= scale
    }

    setKnobPos({ x: dx, y: dy })

    const forwardValue = Math.max(-1, Math.min(1, -dy / JOYSTICK_MAX_RADIUS))
    dispatchForward(Math.abs(forwardValue) < 0.15 ? 0 : forwardValue)

    const strafeValue = Math.max(-1, Math.min(1, dx / JOYSTICK_MAX_RADIUS))
    dispatchStrafe(Math.abs(strafeValue) < 0.15 ? 0 : strafeValue)
  }, [])

  const handleJoystickEnd = useCallback(() => {
    joystickDraggingRef.current = false
    joystickTouchIdRef.current = null
    setKnobPos({ x: 0, y: 0 })
    dispatchForward(0)
    dispatchStrafe(0)
  }, [])

  /* ================= RIGHT THUMB: SWIPE CAMERA LOOK ================= */
  const startLook = (clientX, clientY, touchId = null) => {
    isLookingRef.current = true
    lookTouchIdRef.current = touchId
    lastLookPosRef.current = { x: clientX, y: clientY }
  }

  const moveLook = (clientX, clientY) => {
    if (!isLookingRef.current) return
    const deltaX = clientX - lastLookPosRef.current.x
    const deltaY = clientY - lastLookPosRef.current.y

    lastLookPosRef.current = { x: clientX, y: clientY }
    dispatchLook(deltaX, deltaY)
  }

  const endLook = () => {
    isLookingRef.current = false
    lookTouchIdRef.current = null
  }

  const toggleRun = (e) => {
    e.stopPropagation()
    const next = !isRunning
    setIsRunning(next)
    dispatchRun(next)
  }

  return (
    <div className="mobile-controls">
      {/* LEFT JOYSTICK BASE */}
      <div
        ref={baseRef}
        className="mc-joystick-base"
        onTouchStart={(e) => {
          e.preventDefault()
          const touch = e.changedTouches[0]
          joystickTouchIdRef.current = touch.identifier
          handleJoystickStart()
          handleJoystickMove(touch.clientX, touch.clientY)
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i]
            if (touch.identifier === joystickTouchIdRef.current) {
              handleJoystickMove(touch.clientX, touch.clientY)
              break
            }
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
              handleJoystickEnd()
              break
            }
          }
        }}
        onTouchCancel={handleJoystickEnd}
        onMouseDown={(e) => {
          handleJoystickStart()
          handleJoystickMove(e.clientX, e.clientY)
        }}
        onMouseMove={(e) => {
          if (joystickDraggingRef.current) handleJoystickMove(e.clientX, e.clientY)
        }}
        onMouseUp={handleJoystickEnd}
        onMouseLeave={() => {
          if (joystickDraggingRef.current) handleJoystickEnd()
        }}
      >
        <div
          className="mc-joystick-knob"
          style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
        />
      </div>

      {/* RIGHT SWIPE LOOK ZONE — sizing/position/z-index now live in CSS
          (was inline style), so the HUD-overlap fix is a one-place edit. */}
      <div
        className="mc-look-zone"
        onTouchStart={(e) => {
          e.preventDefault()
          const touch = e.changedTouches[0]
          startLook(touch.clientX, touch.clientY, touch.identifier)
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i]
            if (touch.identifier === lookTouchIdRef.current) {
              moveLook(touch.clientX, touch.clientY)
              break
            }
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          endLook()
        }}
        onTouchCancel={endLook}
        onMouseDown={(e) => startLook(e.clientX, e.clientY)}
        onMouseMove={(e) => moveLook(e.clientX, e.clientY)}
        onMouseUp={endLook}
        onMouseLeave={endLook}
      />

      {/* RIGHT ACTION BUTTONS */}
      <div className="mc-right-cluster">
        {showInteract && (
          <button
            className="mc-interact-btn"
            onClick={(e) => {
              e.stopPropagation()
              onInteract?.()
            }}
          >
            <span className="mc-interact-icon">✋</span>
            <span className="mc-interact-label">{interactLabel || 'Interact'}</span>
          </button>
        )}
        <button
          className={`mc-run-btn ${isRunning ? 'active' : ''}`}
          onClick={toggleRun}
        >
          🏃
        </button>
      </div>
    </div>
  )
}