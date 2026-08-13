import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'

const INTERACT_RADIUS = 4.5 // Slightly more forgiving radius for smoother gameplay

/**
 * Checks each frame whether the player is within interact range of 
 * the current active (unlocked and incomplete) quest building.
 */
export function useNearbyInteractable(playerPositionRef, questState) {
  const [nearby, setNearby] = useState(null)
  const lastCheckRef = useRef(0)

  useFrame((state) => {
    // Throttle checks to every 100ms for optimal performance
    if (state.clock.elapsedTime - lastCheckRef.current < 0.1) return
    lastCheckRef.current = state.clock.elapsedTime

    if (!playerPositionRef.current || !questState || !questState.chain || !questState.questBuildings) {
      setNearby(null)
      return
    }

    const px = playerPositionRef.current.x
    const pz = playerPositionRef.current.z

    let found = null

    // Iterate through the user's randomized quest chain
    for (const questId of questState.chain) {
      // Skip already completed quests
      if (questState.isComplete(questId)) continue

      // Skip locked quests so players cannot trigger interactions out of order
      if (questState.isLocked && questState.isLocked(questId)) continue

      const b = questState.questBuildings[questId]
      if (!b || b.render_x === undefined || b.render_z === undefined) continue

      // Use render_x / render_z directly as the building's world center
      const centerX = b.render_x
      const centerZ = b.render_z
      const dist = Math.hypot(px - centerX, pz - centerZ)

      if (dist < INTERACT_RADIUS) {
        found = {
          filename: b.filename,
          questId: questId,
          label: (questState.questLabels && questState.questLabels[questId]) || questId,
          render_x: centerX,
          render_z: centerZ,
        }
        break
      }
    }

    setNearby((prev) => {
      // Prevent unnecessary re-renders if the nearby interactable hasn't changed
      if (prev?.questId === found?.questId && prev?.filename === found?.filename) return prev
      return found
    })
  })

  return nearby
}