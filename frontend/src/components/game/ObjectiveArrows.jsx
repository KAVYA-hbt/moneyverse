import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Same chevron + same rotation math as the original ground trail this
// replaced (a straight world-space bearing to the objective --
// `Math.atan2(dx, dz)`, no camera- or facing-relative adjustment, no
// separate turn/U-turn icon variants) -- just ONE of them, floating
// above the player's head, instead of a whole line of them stretching
// out toward the target. That original trail's direction logic was never
// the problem; it was that a whole chain of them spanning all the way to
// the objective visibly crossed straight through buildings in between.
// A single marker tethered to the player never extends more than a
// couple of units from them, so that can't happen, while still pointing
// exactly the same true bearing the trail always did.
const ARRIVE_RADIUS = 3.5   // close enough that the pointer is just noise
const HOVER_Y = 2.15         // above the avatar's head
const BOB_AMPLITUDE = 0.1
const BOB_SPEED = 2

export function ObjectiveArrows({ playerPosRef, target, color = '#38bdf8' }) {
  const groupRef = useRef()
  const materialRef = useRef()

  // Chevron pointing along local +Y; the mesh below tips it flat so +Y
  // becomes +Z, which is the axis group.rotation.y aims.
  const geometry = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0.95)
    s.lineTo(0.62, -0.05)
    s.lineTo(0.26, -0.05)
    s.lineTo(0.26, -0.95)
    s.lineTo(-0.26, -0.95)
    s.lineTo(-0.26, -0.05)
    s.lineTo(-0.62, -0.05)
    s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return

    const player = playerPosRef?.current
    const t = state.clock.elapsedTime

    if (!player || !target) {
      g.visible = false
      return
    }

    const dx = target.x - player.x
    const dz = target.z - player.z
    const dist = Math.hypot(dx, dz)

    if (dist < ARRIVE_RADIUS) {
      g.visible = false
      return
    }

    const angle = Math.atan2(dx, dz)

    g.visible = true
    g.position.set(player.x, HOVER_Y + Math.sin(t * BOB_SPEED) * BOB_AMPLITUDE, player.z)
    g.rotation.y = angle

    if (materialRef.current) {
      materialRef.current.opacity = 0.6 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3))
    }
  })

  return (
    <group ref={groupRef} visible={false} scale={0.55}>
      <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          ref={materialRef}
          color={color}
          transparent
          opacity={0.85}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
