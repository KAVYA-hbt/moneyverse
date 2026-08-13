import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * CheckpointBurst
 * 3D Task Completion Effect featuring:
 * 1. Expanding & fading emerald ground shockwave ring.
 * 2. Radial upward burst of glowing sparkle particles with gravity decay.
 * 3. Automatic state cleanup via `onComplete` callback.
 */
export default function CheckpointBurst({ position = [0, 0, 0], onComplete }) {
  const ringRef = useRef()
  const particlesRef = useRef()
  const progress = useRef(0)

  const particleCount = 45

  // Generate initial random positions & 3D velocity vectors
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const vel = []

    for (let i = 0; i < particleCount; i++) {
      // Small spawn area around origin
      pos[i * 3] = (Math.random() - 0.5) * 0.8
      pos[i * 3 + 1] = 0.2
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8

      // Radial angle + vertical pop
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 0.12 + 0.05

      vel.push({
        x: Math.cos(angle) * speed,
        y: Math.random() * 0.2 + 0.12, // Initial jump height
        z: Math.sin(angle) * speed,
      })
    }

    return [pos, vel]
  }, [particleCount])

  useFrame((_, delta) => {
    // Animation progress duration (~0.85s total)
    progress.current += delta * 1.2

    if (progress.current >= 1) {
      if (onComplete) onComplete()
      return
    }

    const easeOut = 1 - Math.pow(1 - progress.current, 3)
    const fadeOut = Math.max(0, 1 - progress.current)

    // 1. Expand and fade ground shockwave ring
    if (ringRef.current) {
      const scale = 1 + easeOut * 9
      ringRef.current.scale.set(scale, scale, 1)
      ringRef.current.material.opacity = fadeOut * 0.95
    }

    // 2. Animate particle trajectory with light gravity
    if (particlesRef.current) {
      const geo = particlesRef.current.geometry
      const posAttr = geo.attributes.position

      for (let i = 0; i < particleCount; i++) {
        // Gravity effect pulling Y velocity down slightly over time
        velocities[i].y -= delta * 0.2

        posAttr.setXYZ(
          i,
          posAttr.getX(i) + velocities[i].x * delta * 60,
          posAttr.getY(i) + velocities[i].y * delta * 60,
          posAttr.getZ(i) + velocities[i].z * delta * 60
        )
      }

      posAttr.needsUpdate = true
      particlesRef.current.material.opacity = fadeOut
    }
  })

  return (
    <group position={position}>
      {/* Ground Expanding Shockwave Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshBasicMaterial
          color="#10B981"
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Glowing Burst Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          color="#34D399"
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}