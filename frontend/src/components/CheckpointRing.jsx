import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function CheckpointRing({ building, visible, color = '#F2A93B' }) {
  const glowRef = useRef()
  const coreRef = useRef()

  useFrame((state) => {
    // Gentle pulse on the outer glow so it reads as "alive"
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.12
    if (glowRef.current) glowRef.current.scale.set(pulse, pulse, 1)

    // Subtle shimmer on the core opacity for a "shining" feel
    if (coreRef.current) {
      coreRef.current.material.opacity = 0.85 + Math.sin(state.clock.elapsedTime * 4) * 0.15
    }
  })

  if (!building || !visible || building.render_x === undefined || building.render_z === undefined) {
    return null
  }

  const width = building.scaled_width || 0
  const depth = building.scaled_depth || 0
  const centerX = building.render_x + width / 2
  const centerZ = building.render_z + depth / 2
  const groundY = (building.render_y || 0) + 0.05

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[centerX, groundY, centerZ]}>
      {/* Soft outer glow - larger, low opacity, gives the shining feel */}
      <mesh ref={glowRef}>
        <circleGeometry args={[1.4, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {/* Solid filled core - noticeably smaller than the old hollow ring */}
      <mesh ref={coreRef}>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
      </mesh>

      {/* Thin bright rim so it still reads clearly against any ground color */}
      <mesh>
        <ringGeometry args={[0.85, 0.95, 32]} />
        <meshBasicMaterial color="#fff8dc" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  )
}