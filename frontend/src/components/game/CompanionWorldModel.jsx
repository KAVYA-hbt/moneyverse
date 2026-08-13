import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'

// Same clip-name convention as the rest of the project — adjust here only
// if the real names inside these FBX files differ.
const CLIP_NAMES = { death: 'Death', wave: 'Wave', yes: 'Yes', no: 'No', walk: 'Walk', run: 'Run' }

// Avatar.jsx's own target height (proven correct by every screenshot so
// far) — companion is sized relative to THIS, not an independent guess.
const AVATAR_TARGET_HEIGHT = 1.5008
const COMPANION_TARGET_HEIGHT = AVATAR_TARGET_HEIGHT / 3

const FOLLOW_OFFSET = { x: -1.1, z: 0.9 } // trails slightly behind/beside the player
const FOLLOW_SPEED = 4 // higher = catches up faster
const FOLLOW_ARRIVE_THRESHOLD = 0.3
const COMPANION_RADIUS = 0.25 // collision boundary radius for buildings and vehicles

function findClipByName(animations, targetName) {
  if (!animations || !targetName) return null
  return animations.find((clip) => {
    const shortName = clip.name.includes('|') ? clip.name.split('|').pop() : clip.name
    return shortName.toLowerCase() === targetName.toLowerCase()
  })
}

function collidesWithBoxes(x, z, items, radius) {
  if (!items) return false
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

/**
 * Renders inside the SAME <Canvas> as the city/avatar (not its own nested
 * canvas) — shares the real scene camera, so the player's avatar and the
 * companion are naturally both visible together.
 *
 * Positioning: deliberately does NOT recompute any position offset from a
 * bounding box — that was the actual bug (see chat). Exactly like
 * Avatar.jsx, only SCALE is applied to the model itself; the group's own
 * position (driven by the parent/follow logic below) is what places it in
 * the world.
 */
export default function CompanionWorldModel({
  modelUrl,
  position,        // [x, y, z] — used when NOT following (still on the road)
  clipKey,
  isFollowing = false,
  followTarget = null, // { x, z } — the player's current position, when following
  layout = null,       // City layout data containing buildings and parking obstacles
}) {
  const fbx = useFBX(modelUrl)
  const groupRef = useRef()
  const mixerRef = useRef()
  const currentActionRef = useRef(null)
  const currentPosRef = useRef({ x: position?.[0] ?? 0, z: position?.[2] ?? 0 })
  const facingRef = useRef(0)

  useEffect(() => {
    if (!fbx || !groupRef.current) return

    // Root-cause fix for the "floating hand" bug: Robot.fbx has SkinnedMesh
    // nodes (HandL/HandR) that sit as siblings of the RobotArmature skeleton
    // rather than nested inside it. A plain `fbx.clone()` deep-copies the
    // bone hierarchy but SkinnedMesh.copy() only copies the `.skeleton`
    // REFERENCE (see three.js SkinnedMesh.copy) — it does NOT repoint that
    // skeleton at the newly-cloned bones. That leaves HandL/HandR skinned
    // against the original cached `fbx` asset's bones, which live outside
    // this clone entirely and are never touched by this instance's
    // AnimationMixer, scale-normalization, or ground placement below — so
    // they stay frozen at Robot.fbx's raw, full-scale bind pose while the
    // rest of the (non-skinned) body meshes animate and scale normally
    // around them. That mismatch is what reads as a stray mesh fragment
    // floating in the sky. SkeletonUtils.clone() clones bones AND rebinds
    // every SkinnedMesh to the new bones, so this must be used instead of
    // Object3D#clone() for any rigged/skinned FBX or GLTF.
    const clone = cloneWithSkeleton(fbx)

    // Detect whether this file actually contains visible mesh geometry at
    // all — if it's just a bare armature/skeleton with no mesh attached
    // (or the mesh failed to parse), that's a broken source file, not a
    // math bug on this end. Skip adding it and warn clearly instead of
    // rendering a blank object or an exploded-scale shape.
    let hasVisibleMesh = false
    clone.traverse((child) => {
      if (child.isMesh && child.geometry?.attributes?.position?.count > 0) {
        hasVisibleMesh = true
      }
    })
    if (!hasVisibleMesh) {
      console.warn(
        `[CompanionWorldModel] "${modelUrl}" has no visible mesh geometry — ` +
        `likely a broken/incomplete FBX export (e.g. skeleton only, no mesh attached). ` +
        `Not rendering it. Check the source file in your 3D tool.`
      )
      groupRef.current.clear()
      return
    }

    // Fix: Operate on the CLONE, not the cached fbx asset
    clone.scale.set(1, 1, 1)
    clone.position.set(0, 0, 0)
    
    // Fix: FORCE matrix update so Three.js calculates the real geometry size instantly
    clone.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    
    // Guard against a near-zero (not just exactly-zero) bounding height,
    // which would otherwise produce an absurdly large scale factor.
    const safeSizeY = size.y > 0.01 ? size.y : 1
    let scaleFactor = COMPANION_TARGET_HEIGHT / safeSizeY
    
    // Hard ceiling as a last-resort safety net, in case the computed
    // height is legitimately tiny but nonzero (e.g. a malformed export).
    scaleFactor = Math.min(scaleFactor, 20)
    clone.scale.setScalar(scaleFactor)

    // Fix: FORCE matrix update AGAIN before running the safety verification
    clone.updateMatrixWorld(true)

    // VERIFY the actual result instead of trusting the single pre-scale
    // measurement — if this file's raw geometry includes something beyond
    // just the character (a stray mesh, leftover collider, reference
    // geometry at a totally different native scale), the initial height
    // guess can be misleading even with a ceiling applied. This checks the
    // real post-scale bounding box and self-corrects if it's still absurd.
    let verifyBox = new THREE.Box3().setFromObject(clone)
    let verifySize = verifyBox.getSize(new THREE.Vector3())
    const maxDim = Math.max(verifySize.x, verifySize.y, verifySize.z)
    const MAX_SANE_DIMENSION = 3 // generous upper bound for a ~0.5-unit-tall companion
    
    if (maxDim > MAX_SANE_DIMENSION && isFinite(maxDim)) {
      const correction = MAX_SANE_DIMENSION / maxDim
      clone.scale.multiplyScalar(correction)
      console.warn(
        `[CompanionWorldModel] "${modelUrl}" needed extra scale correction after the ` +
        `initial fit — its raw geometry likely includes something oversized beyond the ` +
        `character itself (a stray mesh/collider in the source file). Applied a fallback ` +
        `correction so it renders at a sane size, but the source file should be checked.`
      )
    }

    // Defense-in-depth pass, in addition to the SkeletonUtils fix above:
    // - Hide any stray light/camera/helper nodes some FBX exports leave in
    //   the object tree (these have no visual bulk of their own, but a
    //   stray unshaded camera/light icon helper can still show up as a
    //   visible fragment in some viewers/inspectors).
    // - For every SkinnedMesh, force a fresh bounding box off the NOW
    //   correctly-bound skeleton (there's no `bindMatrixNeedsUpdate` flag
    //   in three.js — the real equivalent is calling `computeBoundingBox()`
    //   after (re)binding, since SkinnedMesh caches it lazily and won't
    //   recompute on its own). Frustum culling is disabled for skinned
    //   parts since their cached bounds don't auto-track the current
    //   animation pose, which can otherwise make an animated hand vanish
    //   mid-clip when it moves outside its bind-pose bounding box.
    clone.updateMatrixWorld(true)
    const preScaleOverallBox = new THREE.Box3().setFromObject(clone)
    const preScaleSize = preScaleOverallBox.getSize(new THREE.Vector3())
    const preScaleDiag = preScaleSize.length()

    clone.traverse((child) => {
      if (child.isLight || child.isCamera) {
        child.visible = false
        return
      }

      if (!child.isMesh) return

      child.castShadow = true
      child.receiveShadow = true
      if (child.material && !child.material.map) {
        child.material = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.6, metalness: 0.15 })
      }

      if (child.isSkinnedMesh) {
        child.frustumCulled = false
        child.computeBoundingBox()
        child.computeBoundingSphere()
      }

      // Safety net only — with the skeleton correctly rebound above this
      // shouldn't trigger, but guards against a genuinely stray/unweighted
      // mesh in some other companion asset: if a single mesh's world
      // bounding box sits wildly outside the character's own overall
      // silhouette (many times the character's own diagonal away from its
      // center), treat it as broken geometry rather than render it
      // floating off in space.
      const meshBox = new THREE.Box3().setFromObject(child)
      if (!meshBox.isEmpty()) {
        const meshCenter = meshBox.getCenter(new THREE.Vector3())
        const overallCenter = preScaleOverallBox.getCenter(new THREE.Vector3())
        const distFromCenter = meshCenter.distanceTo(overallCenter)
        if (preScaleDiag > 0 && distFromCenter > preScaleDiag * 3) {
          console.warn(
            `[CompanionWorldModel] "${modelUrl}" mesh "${child.name}" sits far outside ` +
            `the character's own silhouette after binding — hiding it as stray geometry. ` +
            `Check the source file if this is unexpected.`
          )
          child.visible = false
        }
      }
    })

    groupRef.current.clear()
    groupRef.current.add(clone)

    mixerRef.current = new THREE.AnimationMixer(clone)
    groupRef.current.userData.animations = fbx.animations
  }, [fbx, modelUrl])

  // Re-applies whenever clipKey changes (death -> wave on repair complete)
  useEffect(() => {
    if (!mixerRef.current || !groupRef.current?.userData?.animations) return

    const targetClipName = CLIP_NAMES[clipKey] || CLIP_NAMES.death
    const clip = findClipByName(groupRef.current.userData.animations, targetClipName)
      || groupRef.current.userData.animations[0]
    if (!clip) return

    currentActionRef.current?.stop()

    const action = mixerRef.current.clipAction(clip)
    action.reset()

    if (clipKey === 'death') {
      action.play()
      action.paused = true
      action.time = 0
    } else if (clipKey === 'wave' || clipKey === 'yes' || clipKey === 'no') {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
      action.play()
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.play()
    }

    currentActionRef.current = action
  }, [clipKey])

  useFrame((_, delta) => {
    if (clipKey !== 'death') mixerRef.current?.update(delta)
    if (!groupRef.current) return

    if (isFollowing && followTarget) {
      const targetX = followTarget.x + FOLLOW_OFFSET.x
      const targetZ = followTarget.z + FOLLOW_OFFSET.z
      const dx = targetX - currentPosRef.current.x
      const dz = targetZ - currentPosRef.current.z
      const dist = Math.hypot(dx, dz)

      if (dist > FOLLOW_ARRIVE_THRESHOLD) {
        const alpha = 1 - Math.exp(-FOLLOW_SPEED * delta)
        const stepX = dx * alpha
        const stepZ = dz * alpha

        const currX = currentPosRef.current.x
        const currZ = currentPosRef.current.z

        const buildings = layout?.buildings || []
        const vehicles = layout?.parking ? layout.parking.filter((p) => p.category === 'vehicle') : []

        // Evaluate obstacle collisions along X and Z independently to allow wall sliding
        const hitsX = collidesWithBoxes(currX + stepX, currZ, buildings, COMPANION_RADIUS) ||
                      collidesWithBoxes(currX + stepX, currZ, vehicles, COMPANION_RADIUS)

        const hitsZ = collidesWithBoxes(currX, currZ + stepZ, buildings, COMPANION_RADIUS) ||
                      collidesWithBoxes(currX, currZ + stepZ, vehicles, COMPANION_RADIUS)

        if (!hitsX) currentPosRef.current.x += stepX
        if (!hitsZ) currentPosRef.current.z += stepZ

        facingRef.current = Math.atan2(dx, dz)
      }

      groupRef.current.position.set(currentPosRef.current.x, position?.[1] ?? 0.17, currentPosRef.current.z)
      groupRef.current.rotation.y = facingRef.current
    } else if (position) {
      // Static placement (still on the road, not yet repaired/following)
      groupRef.current.position.set(position[0], position[1], position[2])
      currentPosRef.current = { x: position[0], z: position[2] }
    }
  })

  return <group ref={groupRef} />
}