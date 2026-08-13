import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Avatar from '../Avatar.jsx'

/**
 * Deliberately NOT built on WanderingNPC — that component's movement and
 * NPC-to-NPC collision logic is more advanced code we shouldn't risk
 * touching, and a fixed story NPC doesn't need any of it. This is just a
 * stationary body at a fixed spot, with a small idle bob so it doesn't
 * look like a frozen prop.
 */
export default function FixedStoryNPC({ avatarUrl, position, facingY = 0 }) {
  const groupRef = useRef(null)
  const bobRef = useRef(Math.random() * Math.PI * 2) // random phase so multiple NPCs don't bob in sync

  useFrame((_, delta) => {
    bobRef.current += delta * 1.4
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(bobRef.current) * 0.03
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={[0, facingY, 0]}>
      <Avatar movementState="idle" avatarUrl={avatarUrl} />
    </group>
  )
}