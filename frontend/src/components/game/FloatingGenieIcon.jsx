import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

// Generous screen-space clearance so the icon never renders underneath the
// top bar or the right-side minimap/mission/leaderboard panel — instead of
// disappearing behind them, it clamps to just outside that zone.
const RIGHT_PANEL_CLEARANCE = 240 // px reserved for hud-right + margin, covers all breakpoints
const TOP_BAR_CLEARANCE = 90      // px reserved for hud-top-left

// Reused scratch vector so we don't allocate a new THREE.Vector3 every
// frame for every icon — same pattern as drei's own internal calculatePosition.
const tempV3 = new THREE.Vector3()

// This is the officially supported way to customize <Html>'s screen
// position (drei's own `calculatePosition` prop) — it replicates drei's
// default projection math, then clamps the result away from the HUD
// panels. Staying on this documented hook keeps us on the same
// well-tested render path <Html> already uses internally (a hand-rolled
// createPortal caused a full canvas crash — do not go back to that).
function calculateClampedPosition(el, camera, size) {
  tempV3.setFromMatrixPosition(el.matrixWorld)
  tempV3.project(camera)

  const widthHalf = size.width / 2
  const heightHalf = size.height / 2

  let x = tempV3.x * widthHalf + widthHalf
  let y = -(tempV3.y * heightHalf) + heightHalf

  if (x > size.width - RIGHT_PANEL_CLEARANCE) {
    x = size.width - RIGHT_PANEL_CLEARANCE
  }
  if (y < TOP_BAR_CLEARANCE) {
    y = TOP_BAR_CLEARANCE
  }

  return [x, y]
}

export function FloatingGenieIcon({ 
  position = [0, 2, 0], 
  playerPosition, 
  onTriggerInteract, 
  label = "Press E to Talk",
  icon = "🧞",   // single glyph — a two-glyph default ("🧞✨") was the cause
                 // of the sparkle rendering outside the circle badge
  activeColor = '#3b82f6',
  activeGlow = '#60a5fa',
  revealDistance = 8,   // marker is invisible until player is within this range
  disabled = false,     // when true (e.g. a quiz modal is already open), render nothing
}) {
  const groupRef = useRef()
  const [isNear, setIsNear] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const triggerDistance = 3.5

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.25
    }

    if (disabled) {
      setIsNear(false)
      setIsVisible(false)
      return
    }

    if (playerPosition) {
      const dist = Math.hypot(
        playerPosition.x - position[0], 
        playerPosition.z - position[2]
      )
      setIsNear(dist < triggerDistance)
      setIsVisible(dist < revealDistance)
    } else {
      setIsVisible(false)
    }
  })

  useEffect(() => {
    if (disabled) return
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e' && isNear) {
        onTriggerInteract()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isNear, onTriggerInteract, disabled])

  // Nothing is rendered at all while disabled, or until the player is
  // within revealDistance — markers no longer clutter the map from far
  // away, and never float on top of an open quiz modal.
  if (disabled || !isVisible) return null

  return (
    <group ref={groupRef} position={position}>
      <Html
        center
        distanceFactor={15}
        calculatePosition={calculateClampedPosition}
        zIndexRange={[55, 55]}
      >
        <div 
          onClick={() => isNear && onTriggerInteract()}
          style={{
            cursor: isNear ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            userSelect: 'none',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          <div
            className="fgi-circle"
            style={{
              background: isNear ? activeColor : 'rgba(30, 41, 59, 0.85)',
              border: `2px solid ${isNear ? activeGlow : '#475569'}`,
              boxShadow: isNear ? `0 0 20px ${activeColor}` : '0 4px 10px rgba(0,0,0,0.5)',
            }}
          >
            {icon}
          </div>

          {/* On mobile, MobileControls' Interact button already shows this
              same label — the floating world-space bubble is hidden there
              via CSS (see .fgi-label media query) to avoid duplicating it. */}
          {isNear && (
            <div
              className="fgi-label"
              style={{ border: `1px solid ${activeColor}` }}
            >
              [E] {label}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}