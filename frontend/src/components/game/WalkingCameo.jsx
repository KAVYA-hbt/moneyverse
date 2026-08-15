import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import Avatar from '../Avatar.jsx'

const WALK_SPEED = 2.8 // deliberately slower/more staged than the player's own WALK_SPEED (4)
const ARRIVE_THRESHOLD = 0.12

/**
 * A one-off scripted walk-in for a cutscene NPC (e.g. the Mayor walking
 * in to hand over a badge) — NOT a general-purpose NPC. Deliberately
 * separate from FixedStoryNPC (which is explicitly stationary-only, see
 * its own docstring) and from WanderingNPC (which has its own more
 * involved wander/avoidance logic this doesn't need).
 *
 * Walks in a straight line from `from` to `to`, facing its direction of
 * travel, then faces `faceTowards` once arrived (typically the player,
 * so the two end up looking at each other) and calls onArrive() once,
 * the first frame it settles.
 */
export default function WalkingCameo({ avatarUrl, from, to, faceTowards, onArrive }) {
  const groupRef = useRef(null)
  const posRef = useRef({ x: from.x, z: from.z })
  const rotRef = useRef(Math.atan2(to.x - from.x, to.z - from.z))
  const hasArrivedRef = useRef(false)
  const bobRef = useRef(0)
  // Real state (not just the ref above) specifically so the <Avatar>
  // movementState prop below actually re-renders to 'idle' the moment
  // arrival happens -- mutating a ref inside useFrame never triggers a
  // re-render on its own, so movementState would otherwise stay stuck on
  // whatever it was at mount, walk animation forever.
  const [hasArrived, setHasArrived] = useState(false)

  useFrame((_, delta) => {
    if (!hasArrivedRef.current) {
      const dx = to.x - posRef.current.x
      const dz = to.z - posRef.current.z
      const dist = Math.hypot(dx, dz)

      if (dist <= ARRIVE_THRESHOLD) {
        hasArrivedRef.current = true
        setHasArrived(true)
        onArrive?.()
      } else {
        const dirX = dx / dist
        const dirZ = dz / dist
        const step = Math.min(dist, WALK_SPEED * delta)
        posRef.current.x += dirX * step
        posRef.current.z += dirZ * step

        const targetAngle = Math.atan2(dirX, dirZ)
        let diff = (targetAngle - rotRef.current) % (Math.PI * 2)
        if (diff > Math.PI) diff -= Math.PI * 2
        if (diff < -Math.PI) diff += Math.PI * 2
        rotRef.current += diff * Math.min(1, delta * 10)
      }
    } else if (faceTowards) {
      // Turn to face the player once arrived, same easing as the walk.
      const dx = faceTowards.x - posRef.current.x
      const dz = faceTowards.z - posRef.current.z
      const targetAngle = Math.atan2(dx, dz)
      let diff = (targetAngle - rotRef.current) % (Math.PI * 2)
      if (diff > Math.PI) diff -= Math.PI * 2
      if (diff < -Math.PI) diff += Math.PI * 2
      rotRef.current += diff * Math.min(1, delta * 6)

      bobRef.current += delta * 1.4 // small idle bob once standing, same feel as FixedStoryNPC
    }

    if (groupRef.current) {
      groupRef.current.position.set(
        posRef.current.x,
        from.y + (hasArrivedRef.current ? Math.sin(bobRef.current) * 0.03 : 0),
        posRef.current.z
      )
      groupRef.current.rotation.y = rotRef.current
    }
  })

  return (
    <group ref={groupRef} position={[from.x, from.y, from.z]}>
      <Avatar movementState={hasArrived ? 'idle' : 'walk'} avatarUrl={avatarUrl} />
    </group>
  )
}