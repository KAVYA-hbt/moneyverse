import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import Avatar from '../Avatar.jsx'

const NPC_WALK_SPEED = 1.4
const ARRIVE_THRESHOLD = 0.4
const IDLE_PAUSE_SECONDS = [1.5, 4]
const NEARBY_TARGET_RADIUS = 25
const NPC_RADIUS = 0.4

// Shared registry for NPC-to-NPC collision detection across instances
const activeNpcMap = new Map()

function pickNearbyTarget(roads, fromX, fromZ) {
  if (!roads || roads.length === 0) return [fromX, fromZ]
  const nearby = roads.filter((r) => {
    const rx = r.render_x ?? r.x ?? 0
    const rz = r.render_z ?? r.z ?? 0
    const d = Math.hypot(rx - fromX, rz - fromZ)
    return d > 2 && d < NEARBY_TARGET_RADIUS
  })
  const pool = nearby.length > 0 ? nearby : roads
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return [pick.render_x ?? pick.x ?? 0, pick.render_z ?? pick.z ?? 0]
}

function collidesWithBoxes(x, z, items, radius) {
  if (!items) return false
  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    // render_x/render_z is a CORNER, not a center — the same bug already
    // fixed for the capstone map icon and the fixed-story-NPC spawn
    // placement (see GamePage.jsx). This collision check was still using
    // it as a center, which shifts every building's hitbox by half its
    // own width/depth — that offset is exactly why wandering NPCs were
    // seen walking into/through walls despite this collision code
    // existing: half the building was correctly guarded, the other half
    // wasn't guarded at all. Vehicle/parking items use position_x/x,
    // which IS already center-based, so only the render_x/render_z path
    // needs the corner-to-center correction.
    const usesCornerCoords = item.render_x !== undefined || item.render_z !== undefined
    const rawX = item.render_x ?? item.position_x ?? item.x ?? 0
    const rawZ = item.render_z ?? item.position_z ?? item.z ?? 0
    const width = item.scaled_width || item.width || 3
    const depth = item.scaled_depth || item.depth || 3
    const bx = usesCornerCoords ? rawX + width / 2 : rawX
    const bz = usesCornerCoords ? rawZ + depth / 2 : rawZ

    // Use centered bounding box or offset based on layout format
    const minX = bx - width / 2 - radius
    const maxX = bx + width / 2 + radius
    const minZ = bz - depth / 2 - radius
    const maxZ = bz + depth / 2 + radius

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