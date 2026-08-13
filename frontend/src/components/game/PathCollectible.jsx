import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'

export function PathCollectible({ position, type = 'coin', reward = 10, playerPosition, onCollect }) {
  const groupRef = useRef()
  const spinRef = useRef()
  const [collected, setCollected] = useState(false)

  useFrame((state, delta) => {
    if (collected || !groupRef.current || !spinRef.current) return

    // Spin around vertical Y axis while standing upright
    spinRef.current.rotation.y += delta * 2.5

    // Gentle up & down floating bobbing effect
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 4) * 0.12

    // Proximity collision detection
    if (playerPosition) {
      const dist = Math.hypot(
        playerPosition.x - position[0],
        playerPosition.z - position[2]
      )
      if (dist < 1.8) {
        setCollected(true)
        if (onCollect) onCollect(reward, type)
      }
    }
  })

  if (collected) return null

  return (
    <group ref={groupRef} position={position}>
      <group ref={spinRef}>
        {/* rotation={[Math.PI / 2, 0, 0]} tilts the cylinder upright */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.08, 24]} />
          <meshStandardMaterial
            color={type === 'coin' ? '#FFD700' : '#38BDF8'}
            metalness={0.85}
            roughness={0.25}
            depthTest={true}
            depthWrite={true}
          />
        </mesh>
      </group>
    </group>
  )
}