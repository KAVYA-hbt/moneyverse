import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Avatar from './Avatar.jsx'
import { useKeyboardMovement } from '../hooks/useKeyboardMovement.js'
import { useNearbyInteractable } from './InteractionSystem.jsx'

const WALK_SPEED = 4
const RUN_SPEED = 8
const KEYBOARD_TURN_SPEED = 2.4 // radians/sec of camera rotation while A/D held

const FOLLOW_DISTANCE = 5.5
const AVATAR_RADIUS = 0.3
const VEHICLE_RADIUS = 0.2

// Intro Fly-in Settings
const INTRO_DURATION = 5.0
const BIRD_EYE_HEIGHT = 110
const BIRD_EYE_DISTANCE = 70

// Static Reusable Three.js Math Objects
const tempOrigin = new THREE.Vector3()
const tempTarget = new THREE.Vector3()
const tempDir = new THREE.Vector3()
const tempRay = new THREE.Ray()
const tempHit = new THREE.Vector3()
const tempOffset = new THREE.Vector3()
const tempTargetCam = new THREE.Vector3()
const tempOverviewPos = new THREE.Vector3()
const tempLookAt = new THREE.Vector3()

function computeCenterSpawn(layout) {
  if (!layout || !layout.buildings || layout.buildings.length === 0) {
    return { position: [0, 0.17, 0], facingAngle: 0 }
  }

  const centerX = layout.buildings.reduce((sum, b) => sum + (b.render_x || 0), 0) / layout.buildings.length
  const centerZ = layout.buildings.reduce((sum, b) => sum + (b.render_z || 0), 0) / layout.buildings.length

  if (layout.roads && layout.roads.length > 0) {
    const closestRoad = layout.roads.reduce((closest, road) => {
      const distToRoad = Math.hypot(road.render_x - centerX, road.render_z - centerZ)
      const distToClosest = Math.hypot(closest.render_x - centerX, closest.render_z - centerZ)
      return distToRoad < distToClosest ? road : closest
    })

    return {
      position: [closestRoad.render_x, 0.17, closestRoad.render_z],
      facingAngle: 0,
    }
  }

  return {
    position: [centerX, 0.17, centerZ],
    facingAngle: 0,
  }
}

function collidesWithBoxes(x, z, items, radius) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const minX = item.position_x - radius
    const maxX = item.position_x + (item.scaled_width || 10) + radius
    const minZ = item.position_z - radius
    const maxZ = item.position_z + (item.scaled_depth || 10) + radius
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return true
  }
  return false
}

export default function PlayerController({
  layout,
  questState,
  onNearbyChange,
  avatarUrl,
  onPositionChange,
  movementLocked = false,
  // Cutscene hooks (e.g. the Mayor badge handoff) -- when scriptedWalkTarget
  // is set, normal input is ignored (same as movementLocked) and the player
  // instead walks toward that world {x, z} point on its own, calling
  // onScriptedArrive() once it gets there. teleportTo is a one-shot {x, z,
  // facing} snap, applied the instant it's given a new object reference --
  // used to stage the player at a cutscene starting mark before the
  // scripted walk begins, without it playing out as a visible dash across
  // the map to get there.
  scriptedWalkTarget = null,
  onScriptedArrive,
  teleportTo = null,
}) {
  const { stateRef } = useKeyboardMovement()
  const spawn = useMemo(() => computeCenterSpawn(layout), [layout])

  const mapCenter = useMemo(() => {
    if (!layout || !layout.buildings || layout.buildings.length === 0) {
      return { x: spawn.position[0], z: spawn.position[2] }
    }
    const sumX = layout.buildings.reduce((acc, b) => acc + (b.render_x || 0), 0)
    const sumZ = layout.buildings.reduce((acc, b) => acc + (b.render_z || 0), 0)
    return {
      x: sumX / layout.buildings.length,
      z: sumZ / layout.buildings.length,
    }
  }, [layout, spawn])

  const buildingBoxes = useMemo(() => {
    if (!layout?.buildings) return []
    return layout.buildings.map((b) => {
      return new THREE.Box3(
        new THREE.Vector3(b.position_x, 0, b.position_z),
        new THREE.Vector3(
          b.position_x + (b.scaled_width || 10),
          b.scaled_height || 35,
          b.position_z + (b.scaled_depth || 10)
        )
      )
    })
  }, [layout])

  const vehicleObstacles = useMemo(
    () => (layout?.parking ? layout.parking.filter((p) => p.category === 'vehicle') : []),
    [layout]
  )

  const positionRef = useRef(new THREE.Vector3(...spawn.position))
  const rotationRef = useRef(spawn.facingAngle)
  const mobileInputRef = useRef({ forward: 0, strafe: 0, run: false })
  const groupRef = useRef()
  const introTimerRef = useRef(0)

  const { camera } = useThree()
  const [movementState, setMovementState] = useState('idle')

  const nearby = useNearbyInteractable(positionRef, layout?.buildings || [], questState?.questLabels)

  useEffect(() => {
    onNearbyChange?.(nearby)
  }, [nearby, onNearbyChange])

  const orbitRef = useRef({
    yaw: spawn.facingAngle + Math.PI,
    pitch: 0.35,
    distance: FOLLOW_DISTANCE,
  })

  const draggingRef = useRef(false)
  const lastTouchLookTimeRef = useRef(0)
  const isMovingRef = useRef(false)
  const hasArrivedRef = useRef(false)

  // One-shot teleport (e.g. staging the player at a cutscene mark) --
  // fires whenever the CALLER passes a new teleportTo object, not on
  // every render, so this can't fight the per-frame movement code below.
  useEffect(() => {
    if (!teleportTo) return
    positionRef.current.set(teleportTo.x, positionRef.current.y, teleportTo.z)
    if (typeof teleportTo.facing === 'number') rotationRef.current = teleportTo.facing
    hasArrivedRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teleportTo])

  // Resets arrival tracking each time a NEW scripted target is handed in
  // (a changed object reference), so a second cutscene walk later in the
  // session doesn't inherit the previous one's "already arrived" state.
  useEffect(() => {
    hasArrivedRef.current = false
  }, [scriptedWalkTarget])

  // Event Listeners for Mouse (desktop) and Custom Mobile Events (touch)
  useEffect(() => {
    const onMouseDown = (e) => {
      if (e.button === 0) draggingRef.current = true
    }
    const onMouseUp = () => {
      draggingRef.current = false
    }
    const onMouseMove = (e) => {
      if (!draggingRef.current) return
      orbitRef.current.yaw -= e.movementX * 0.005
      orbitRef.current.pitch -= e.movementY * 0.005
      orbitRef.current.pitch = Math.max(0.08, Math.min(Math.PI / 2.2, orbitRef.current.pitch))
    }
    const onWheel = (e) => {
      orbitRef.current.distance += e.deltaY * 0.02
      orbitRef.current.distance = Math.max(3, Math.min(25, orbitRef.current.distance))
    }

    const handleForward = (e) => { mobileInputRef.current.forward = e.detail }
    const handleStrafe = (e) => { mobileInputRef.current.strafe = e.detail }
    const handleRun = (e) => { mobileInputRef.current.run = e.detail }
    const handleTouchLook = (e) => {
      const { deltaX, deltaY } = e.detail
      const sensitivity = 0.004

      orbitRef.current.yaw -= deltaX * sensitivity
      orbitRef.current.pitch -= deltaY * sensitivity
      orbitRef.current.pitch = Math.max(0.08, Math.min(Math.PI / 2.2, orbitRef.current.pitch))

      lastTouchLookTimeRef.current = performance.now()
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('mv-forward', handleForward)
    window.addEventListener('mv-strafe', handleStrafe)
    window.addEventListener('mv-run', handleRun)
    window.addEventListener('mv-look', handleTouchLook)

    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('mv-forward', handleForward)
      window.removeEventListener('mv-strafe', handleStrafe)
      window.removeEventListener('mv-run', handleRun)
      window.removeEventListener('mv-look', handleTouchLook)
    }
  }, [])

  useFrame((_, delta) => {
    const isScripted = !!scriptedWalkTarget && !hasArrivedRef.current
    const effectivelyLocked = movementLocked || !!scriptedWalkTarget

    // Scripted cutscene walk (e.g. Mayor badge handoff) -- drives the
    // SAME positionRef/rotationRef the normal input branch below does,
    // just steered toward a fixed target instead of live input, so the
    // walk animation, collision-free movement, and camera-follow all
    // keep working unchanged. Runs BEFORE the normal branch and skips it
    // for this frame when active.
    if (isScripted) {
      const dx0 = scriptedWalkTarget.x - positionRef.current.x
      const dz0 = scriptedWalkTarget.z - positionRef.current.z
      const dist = Math.hypot(dx0, dz0)
      const ARRIVE_THRESHOLD = 0.12
      const CUTSCENE_WALK_SPEED = WALK_SPEED * 0.7 // a touch slower — reads as deliberate/staged, not a run

      if (dist <= ARRIVE_THRESHOLD) {
        hasArrivedRef.current = true
        onScriptedArrive?.()
      } else {
        const dirX = dx0 / dist
        const dirZ = dz0 / dist
        const step = Math.min(dist, CUTSCENE_WALK_SPEED * delta)
        positionRef.current.x += dirX * step
        positionRef.current.z += dirZ * step

        const targetAngle = Math.atan2(dirX, dirZ)
        let diff = (targetAngle - rotationRef.current) % (Math.PI * 2)
        if (diff > Math.PI) diff -= Math.PI * 2
        if (diff < -Math.PI) diff += Math.PI * 2
        rotationRef.current += diff * Math.min(1, delta * 12)
      }

      // Camera settles behind the player, looking toward the meeting
      // point -- forced (not gated behind "is the user free-looking",
      // unlike the normal branch below) since input is already locked
      // for the whole cutscene anyway, so there's no free-look to
      // respect. Slightly wider/higher than the normal follow distance
      // for a bit more of an establishing view of the handoff.
      const targetYaw = rotationRef.current + Math.PI
      let yawDiff = (targetYaw - orbitRef.current.yaw) % (Math.PI * 2)
      if (yawDiff > Math.PI) yawDiff -= Math.PI * 2
      if (yawDiff < -Math.PI) yawDiff += Math.PI * 2
      const camSnapSpeed = 3
      orbitRef.current.yaw += yawDiff * Math.min(1, delta * camSnapSpeed)
      orbitRef.current.pitch += (0.4 - orbitRef.current.pitch) * Math.min(1, delta * camSnapSpeed)
      orbitRef.current.distance += (7 - orbitRef.current.distance) * Math.min(1, delta * camSnapSpeed)
    }

    // Keyboard A/D now rotates the CAMERA continuously (same idea as
    // mouse-drag / touch-look), instead of the old one-shot 90° character
    // turn — which stopped making sense once movement became
    // camera-relative, since it got overwritten the instant you also moved.
    // While movementLocked (e.g. the companion repair intro is playing) OR
    // a scripted cutscene walk is active, all player input is ignored here
    // — the camera/intro-flight logic further down is untouched, only the
    // player's own control is frozen.
    const kbTurnRate = effectivelyLocked ? 0 : stateRef.current.turnRate
    if (kbTurnRate !== 0) {
      orbitRef.current.yaw += kbTurnRate * KEYBOARD_TURN_SPEED * delta
      lastTouchLookTimeRef.current = performance.now() // reuse the same "user is looking" grace window
    }

    // Combine keyboard & mobile joystick inputs — mobile joystick wins if active
    const kbForward = effectivelyLocked ? 0 : stateRef.current.forward
    const kbRun = effectivelyLocked ? false : stateRef.current.run

    const fwdInput = effectivelyLocked
      ? 0
      : mobileInputRef.current.forward !== 0
      ? mobileInputRef.current.forward
      : kbForward
    const strInput = effectivelyLocked ? 0 : mobileInputRef.current.strafe
    const isRunning = effectivelyLocked ? false : (mobileInputRef.current.run || kbRun)

    const moveMag = isScripted ? 0 : Math.hypot(fwdInput, strInput)
    const moving = isScripted ? false : moveMag > 0.15
    isMovingRef.current = moving || isScripted
    const speed = isRunning ? RUN_SPEED : WALK_SPEED

    // Camera-Relative 360° Movement — forward/strafe are relative to
    // wherever the camera is currently looking, avatar auto-rotates to
    // face its travel direction.
    if (moving) {
      const camYaw = orbitRef.current.yaw

      const camFwdX = -Math.sin(camYaw)
      const camFwdZ = -Math.cos(camYaw)
      const camRightX = Math.cos(camYaw)
      const camRightZ = -Math.sin(camYaw)

      const dirX = (camFwdX * fwdInput + camRightX * strInput) / moveMag
      const dirZ = (camFwdZ * fwdInput + camRightZ * strInput) / moveMag

      const targetAngle = Math.atan2(dirX, dirZ)
      let diff = (targetAngle - rotationRef.current) % (Math.PI * 2)
      if (diff > Math.PI) diff -= Math.PI * 2
      if (diff < -Math.PI) diff += Math.PI * 2
      rotationRef.current += diff * Math.min(1, delta * 12)

      const normMag = Math.min(1, moveMag)
      const moveDist = normMag * speed * delta
      const dx = dirX * moveDist
      const dz = dirZ * moveDist

      const currentX = positionRef.current.x
      const currentZ = positionRef.current.z

      const hitsX =
        collidesWithBoxes(currentX + dx, currentZ, layout?.buildings || [], AVATAR_RADIUS) ||
        collidesWithBoxes(currentX + dx, currentZ, vehicleObstacles, VEHICLE_RADIUS)

      const hitsZ =
        collidesWithBoxes(currentX, currentZ + dz, layout?.buildings || [], AVATAR_RADIUS) ||
        collidesWithBoxes(currentX, currentZ + dz, vehicleObstacles, VEHICLE_RADIUS)

      if (!hitsX) positionRef.current.x += dx
      if (!hitsZ) positionRef.current.z += dz

      // Auto-follow camera behind player only when nobody is actively
      // free-looking (mouse-drag, keyboard A/D turn, or a recent touch-look).
      const isUserLooking = draggingRef.current || kbTurnRate !== 0 || (performance.now() - lastTouchLookTimeRef.current < 800)

      if (!isUserLooking) {
        const targetYaw = rotationRef.current + Math.PI
        let yawDiff = (targetYaw - orbitRef.current.yaw) % (Math.PI * 2)
        if (yawDiff > Math.PI) yawDiff -= Math.PI * 2
        if (yawDiff < -Math.PI) yawDiff += Math.PI * 2

        const snapSpeed = 5
        orbitRef.current.yaw += yawDiff * Math.min(1, delta * snapSpeed)
        orbitRef.current.pitch += (0.35 - orbitRef.current.pitch) * Math.min(1, delta * snapSpeed)
        orbitRef.current.distance += (FOLLOW_DISTANCE - orbitRef.current.distance) * Math.min(1, delta * snapSpeed)
      }
    }

    if (onPositionChange && positionRef.current) {
      onPositionChange({
        x: positionRef.current.x,
        z: positionRef.current.z,
        facing: rotationRef.current,
      })
    }

    // isScripted stays true for the walking frames and flips false the
    // instant hasArrivedRef is set above, so this naturally lands on
    // 'walk' while en route and 'idle' the moment it arrives — no
    // separate scripted-vs-normal branching needed here.
    const nextState = (moving || isScripted) ? (isRunning ? 'run' : 'walk') : 'idle'
    if (nextState !== movementState) setMovementState(nextState)

    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current)
      groupRef.current.rotation.y = rotationRef.current
    }

    // Camera Positioning & Occlusion Raycasting
    const { yaw, pitch, distance: desiredDist } = orbitRef.current

    tempOffset.set(
      Math.sin(yaw) * Math.cos(pitch) * desiredDist,
      Math.sin(pitch) * desiredDist + 1.8,
      Math.cos(yaw) * Math.cos(pitch) * desiredDist
    )

    tempOrigin.set(positionRef.current.x, positionRef.current.y + 1.6, positionRef.current.z)
    tempTarget.copy(positionRef.current).add(tempOffset)

    tempDir.subVectors(tempTarget, tempOrigin).normalize()
    tempRay.set(tempOrigin, tempDir)

    let closestHitDist = desiredDist

    for (let i = 0; i < buildingBoxes.length; i++) {
      if (tempRay.intersectBox(buildingBoxes[i], tempHit)) {
        const hitDistance = tempOrigin.distanceTo(tempHit)
        if (hitDistance < closestHitDist) {
          closestHitDist = Math.max(1.2, hitDistance - 0.4)
        }
      }
    }

    tempTargetCam.copy(tempOrigin).addScaledVector(tempDir, closestHitDist)
    tempLookAt.set(positionRef.current.x, positionRef.current.y + 1.5, positionRef.current.z)

    // Intro Flight & Camera Lerping
    if (introTimerRef.current < INTRO_DURATION) {
      introTimerRef.current += delta
      const progress = Math.min(introTimerRef.current / INTRO_DURATION, 1)

      tempOverviewPos.set(mapCenter.x, BIRD_EYE_HEIGHT, mapCenter.z + BIRD_EYE_DISTANCE)

      const easeProgress = progress * progress * (3 - 2 * progress)
      camera.position.lerpVectors(tempOverviewPos, tempTargetCam, easeProgress)
      camera.lookAt(tempLookAt)
    } else {
      const dampSpeed = moving ? 10 : 7
      const alpha = 1 - Math.exp(-dampSpeed * delta)
      camera.position.lerp(tempTargetCam, alpha)
      camera.lookAt(tempLookAt)
    }
  })

  return (
    <group ref={groupRef}>
      <Avatar movementState={movementState} avatarUrl={avatarUrl} />
    </group>
  )
}