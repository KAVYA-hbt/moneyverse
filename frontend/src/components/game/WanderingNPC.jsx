import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import Avatar from '../Avatar.jsx'

const NPC_WALK_SPEED = 1.4
const ARRIVE_THRESHOLD = 0.4
const IDLE_PAUSE_SECONDS = [1.5, 4]
// Every road tile in a generated city sits within ~9 units of some
// building (checked against real generated layouts), so a wander hop
// much longer than that routinely cuts across open blocks with no
// building in view partway through -- reading as "wandered outside the
// city" even though both ends of the hop are legitimate road tiles.
// Keeping hops shorter than that margin means an NPC is never more than
// a short walk from a visible building at any point along its path.
const NEARBY_TARGET_RADIUS = 12
const NPC_RADIUS = 0.4

// Shared registry for NPC-to-NPC collision detection across instances
const activeNpcMap = new Map()

function pickNearbyTarget(roads, fromX, fromZ) {
  if (!roads || roads.length === 0) return [fromX, fromZ]

  const withDist = roads.map((r) => {
    const rx = r.render_x ?? r.x ?? 0
    const rz = r.render_z ?? r.z ?? 0
    return { r, rx, rz, d: Math.hypot(rx - fromX, rz - fromZ) }
  })

  // Widen the search in steps rather than falling straight back to
  // "anywhere in the whole city" the moment nothing's within the normal
  // radius -- that single-step fallback was the other way a hop could
  // end up crossing a large open block: the nearest actual road tile is
  // still local, just a bit past NEARBY_TARGET_RADIUS, and reaching for
  // it is a much shorter walk than reaching for a uniformly random tile
  // anywhere on the map.
  for (const maxDist of [NEARBY_TARGET_RADIUS, NEARBY_TARGET_RADIUS * 2, NEARBY_TARGET_RADIUS * 4, Infinity]) {
    const nearby = withDist.filter((e) => e.d > 2 && e.d < maxDist)
    if (nearby.length > 0) {
      const pick = nearby[Math.floor(Math.random() * nearby.length)]
      return [pick.rx, pick.rz]
    }
  }

  const pick = withDist[Math.floor(Math.random() * withDist.length)]
  return [pick.rx, pick.rz]
}

function collidesWithBoxes(x, z, items, radius) {
  if (!items) return false
  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    // render_x/render_z is a per-MODEL render offset (wherever that
    // specific FBX/GLB's own origin needs to land so it draws in the
    // right place — see measure_assets.py) and its relationship to the
    // asset's actual footprint varies by model and rotation. It is NOT a
    // reliable box corner, which is exactly why NPCs kept clipping into
    // buildings despite an earlier attempt to "fix" this by treating it
    // as one. position_x/position_z is the backend's real placement
    // corner (pack_layout.py / generate_layout.py) and is what
    // PlayerController.jsx's own (working, proven) building collision
    // already keys off — matched here instead of reinventing a second,
    // different formula for NPCs.
    const bx = item.position_x ?? item.x ?? 0
    const bz = item.position_z ?? item.z ?? 0
    const width = item.scaled_width || item.width || 10
    const depth = item.scaled_depth || item.depth || 10

    const minX = bx - radius
    const maxX = bx + width + radius
    const minZ = bz - radius
    const maxZ = bz + depth + radius

    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return true
  }
  return false
}

function collidesWithNPCs(x, z, currentId, radius) {
  for (const [id, pos] of activeNpcMap.entries()) {
    if (id === currentId) continue
    const dist = Math.hypot(x - pos.x, z - pos.z)
    if (dist < radius * 2) return true
  }
  return false
}

export default function WanderingNPC({ id, avatarUrl, roads, startPosition, layout, onPositionUpdate }) {
  const groupRef = useRef()
  const [movementState, setMovementState] = useState('idle')

  // Generate a unique ID for this NPC instance
  const npcId = useMemo(() => Math.random().toString(36).substring(2, 9), [])

  const posRef = useRef({ x: startPosition[0], z: startPosition[1] })
  const targetRef = useRef(pickNearbyTarget(roads, startPosition[0], startPosition[1]))
  const pauseTimerRef = useRef(0)
  const rotationRef = useRef(0)

  // Obstacle lists built from layout with proper fallback formatting
  const buildingObstacles = useMemo(() => layout?.buildings || [], [layout])
  const vehicleObstacles = useMemo(
    () => (layout?.parking ? layout.parking.filter((p) => p.category === 'vehicle') : []),
    [layout]
  )

  // Register and clean up position in the shared NPC map
  useEffect(() => {
    activeNpcMap.set(npcId, posRef.current)
    return () => {
      activeNpcMap.delete(npcId)
    }
  }, [npcId])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    if (pauseTimerRef.current > 0) {
      pauseTimerRef.current -= delta
      if (movementState !== 'idle') setMovementState('idle')
      return
    }

    const dx = targetRef.current[0] - posRef.current.x
    const dz = targetRef.current[1] - posRef.current.z
    const dist = Math.hypot(dx, dz)

    if (dist < ARRIVE_THRESHOLD) {
      const [minPause, maxPause] = IDLE_PAUSE_SECONDS
      pauseTimerRef.current = minPause + Math.random() * (maxPause - minPause)
      targetRef.current = pickNearbyTarget(roads, posRef.current.x, posRef.current.z)
      if (movementState !== 'idle') setMovementState('idle')
      return
    }

    const dirX = dx / dist
    const dirZ = dz / dist
    
    const stepDist = NPC_WALK_SPEED * delta
    const moveX = dirX * stepDist
    const moveZ = dirZ * stepDist

    const currentX = posRef.current.x
    const currentZ = posRef.current.z

    // Collision checks before stepping (incorporates buildings, vehicles, and other NPCs)
    const hitsX =
      collidesWithBoxes(currentX + moveX, currentZ, buildingObstacles, NPC_RADIUS) ||
      collidesWithBoxes(currentX + moveX, currentZ, vehicleObstacles, NPC_RADIUS) ||
      collidesWithNPCs(currentX + moveX, currentZ, npcId, NPC_RADIUS)

    const hitsZ =
      collidesWithBoxes(currentX, currentZ + moveZ, buildingObstacles, NPC_RADIUS) ||
      collidesWithBoxes(currentX, currentZ + moveZ, vehicleObstacles, NPC_RADIUS) ||
      collidesWithNPCs(currentX, currentZ + moveZ, npcId, NPC_RADIUS)

    // If completely blocked by an obstacle along path, reroute immediately
    if (hitsX && hitsZ) {
      pauseTimerRef.current = 0.8
      targetRef.current = pickNearbyTarget(roads, posRef.current.x, posRef.current.z)
      if (movementState !== 'idle') setMovementState('idle')
      return
    }

    // Apply movement if path is clear, sliding along single-axis blocks if possible
    if (!hitsX) posRef.current.x += moveX
    if (!hitsZ) posRef.current.z += moveZ

    if (hitsX && !hitsZ) {
      // Slide along Z if X is blocked
      targetRef.current = pickNearbyTarget(roads, posRef.current.x, posRef.current.z)
    } else if (hitsZ && !hitsX) {
      // Slide along X if Z is blocked
      targetRef.current = pickNearbyTarget(roads, posRef.current.x, posRef.current.z)
    }

    // Update position reference in map for other NPCs to read
    activeNpcMap.set(npcId, posRef.current)
    // Reports position to whoever's listening outside this component (e.g.
    // GamePage, for proximity/interact detection) — purely additive, no
    // existing movement/collision behavior above this line was touched.
    onPositionUpdate?.(id, posRef.current)

    const targetRotation = Math.atan2(dx, dz)
    // Smooth rotation interpolation
    let diff = targetRotation - rotationRef.current
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    rotationRef.current += diff * Math.min(1, delta * 6)

    groupRef.current.position.set(posRef.current.x, 0.17, posRef.current.z)
    groupRef.current.rotation.y = rotationRef.current

    if (movementState !== 'walk') setMovementState('walk')
  })

  return (
    <group ref={groupRef} position={[startPosition[0], 0.17, startPosition[1]]}>
      <Avatar movementState={movementState} avatarUrl={avatarUrl} />
    </group>
  )
}