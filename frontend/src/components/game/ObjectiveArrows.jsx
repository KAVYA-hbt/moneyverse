import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A trail of flat chevrons laid on the ground between the player and their
// current objective. Positions are updated imperatively in useFrame off the
// player's ref rather than from React state, so the trail tracks movement
// smoothly without re-rendering GamePage on every step.
const ARROW_COUNT = 9
const ARROW_SPACING = 2.6   // world units between chevrons
const START_OFFSET = 2.4    // don't draw one on top of the player
const STOP_SHORT = 1.6      // stop before overlapping the destination marker
const ARRIVE_RADIUS = 3.5   // close enough that the trail is just noise

export function ObjectiveArrows({ playerPosRef, target, color = '#38bdf8', y = 0.24 }) {
  const groupRefs = useRef([])
  const materialRefs = useRef([])

  // Chevron pointing along local +Y; the mesh below tips it flat so +Y
  // becomes +Z, which is the axis group.rotation.y aims.
  const geometry = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0.95)
    s.lineTo(0.78, -0.05)
    s.lineTo(0.32, -0.05)
    s.lineTo(0.32, -0.95)
    s.lineTo(-0.32, -0.95)
    s.lineTo(-0.32, -0.05)
    s.lineTo(-0.78, -0.05)
    s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    const player = playerPosRef?.current
    const t = state.clock.elapsedTime

    if (!player || !target) {
      groupRefs.current.forEach((g) => { if (g) g.visible = false })
      return
    }

    const dx = target.x - player.x
    const dz = target.z - player.z
    const dist = Math.hypot(dx, dz)

    if (dist < ARRIVE_RADIUS) {
      groupRefs.current.forEach((g) => { if (g) g.visible = false })
      return
    }

    const ux = dx / dist
    const uz = dz / dist
    const angle = Math.atan2(dx, dz)

    for (let i = 0; i < ARROW_COUNT; i++) {
      const g = groupRefs.current[i]
      if (!g) continue

      const along = START_OFFSET + i * ARROW_SPACING
      if (along > dist - STOP_SHORT) {
        g.visible = false
        continue
      }

      g.visible = true
      g.position.set(player.x + ux * along, y, player.z + uz * along)
      g.rotation.y = angle

      // Brightness travels outward along the trail, so the arrows read as
      // flowing toward the objective instead of just sitting there.
      const mat = materialRefs.current[i]
      if (mat) mat.opacity = 0.28 + 0.52 * (0.5 + 0.5 * Math.sin(t * 3 - i * 0.6))
    }
  })

  return (
    <group>
      {Array.from({ length: ARROW_COUNT }, (_, i) => (
        <group key={i} ref={(el) => (groupRefs.current[i] = el)} visible={false}>
          <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial
              ref={(el) => (materialRefs.current[i] = el)}
              color={color}
              transparent
              opacity={0.6}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
