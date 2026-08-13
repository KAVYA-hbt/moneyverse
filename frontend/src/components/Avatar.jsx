import { useLoader, useFrame } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { getAvatarUrl } from '../utils/avatarDiscovery.js'

function findClipByName(animations, targetName) {
  if (!animations) return null
  return animations.find((clip) => {
    const shortName = clip.name.includes('|')
      ? clip.name.split('|').pop()
      : clip.name
    return shortName.toLowerCase() === targetName.toLowerCase()
  })
}

export default function Avatar({ movementState = 'idle', avatarUrl, onInteractComplete }) {
  const url = avatarUrl || getAvatarUrl()
  const sourceFbx = useLoader(FBXLoader, url)

  // useLoader caches and returns the SAME object for every component that
  // requests this url — the player, background wandering NPCs, and fixed
  // story NPCs can all end up pointing at the same source file (e.g. if
  // your own selected avatar happens to match one of the 3 hardcoded
  // fixed-story-NPC avatars). Three.js's Object3D.add() removes a child
  // from its previous parent the moment it's added to a new one, so
  // without cloning, whichever <Avatar> mounts/updates last silently
  // "steals" the model out of every other instance sharing that url —
  // the earlier one's <group> is left empty (camera still follows it
  // fine, there's just nothing there). SkeletonUtils.clone() (not a
  // plain Object3D#clone()) is required since these are rigged/skinned
  // meshes — see CompanionWorldModel.jsx for the same fix applied there.
  const fbx = useMemo(() => cloneWithSkeleton(sourceFbx), [sourceFbx])

  const mixerRef = useRef()
  const actionsRef = useRef({})
  const currentActionRef = useRef(null)

  useEffect(() => {
    if (!fbx) return

    fbx.scale.set(1, 1, 1)

    const box = new THREE.Box3().setFromObject(fbx)
    const size = box.getSize(new THREE.Vector3())
    const targetHeight = 1.5008
    const scaleFactor = size.y > 0 ? targetHeight / size.y : 1

    fbx.scale.setScalar(scaleFactor)

    fbx.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true

        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((mat) => {
          if (mat) {
            mat.needsUpdate = true
          }
        })
      }
    })

    mixerRef.current = new THREE.AnimationMixer(fbx)

    // 1. Find clips for movement AND interaction — clips live on the
    // ORIGINAL loaded asset, not the clone (SkeletonUtils.clone() doesn't
    // carry over .animations), so read them from sourceFbx instead of fbx.
    const idleClip = findClipByName(sourceFbx.animations, 'Idle')
    const walkClip = findClipByName(sourceFbx.animations, 'Walk')
    const runClip = findClipByName(sourceFbx.animations, 'Run')
    const interactClip = 
      findClipByName(sourceFbx.animations, 'Interact') || 
      findClipByName(sourceFbx.animations, 'Wave') || 
      findClipByName(sourceFbx.animations, 'PickUp')

    if (idleClip) actionsRef.current.idle = mixerRef.current.clipAction(idleClip)
    if (walkClip) actionsRef.current.walk = mixerRef.current.clipAction(walkClip)
    if (runClip) actionsRef.current.run = mixerRef.current.clipAction(runClip)

    // 2. Configure interaction clip to play ONCE
    if (interactClip) {
      const interactAction = mixerRef.current.clipAction(interactClip)
      interactAction.setLoop(THREE.LoopOnce)
      interactAction.clampWhenFinished = true
      actionsRef.current.interact = interactAction
    }

    // 3. Listen for when interaction finishes to inform GamePage
    const handleFinished = (e) => {
      if (e.action === actionsRef.current.interact) {
        if (onInteractComplete) onInteractComplete()
      }
    }
    
    const mixer = mixerRef.current
    mixer.addEventListener('finished', handleFinished)

    if (actionsRef.current.idle) {
      actionsRef.current.idle.play()
      currentActionRef.current = actionsRef.current.idle
    }

    return () => {
      mixer.removeEventListener('finished', handleFinished)
    }
  }, [fbx, sourceFbx, onInteractComplete])

  useEffect(() => {
    const nextAction = actionsRef.current[movementState]
    if (!nextAction || nextAction === currentActionRef.current) return

    nextAction.reset().fadeIn(0.25).play()
    currentActionRef.current?.fadeOut(0.25)
    currentActionRef.current = nextAction
  }, [movementState])

  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
  })

  return <primitive object={fbx} position={[0, 0, 0]} />
}