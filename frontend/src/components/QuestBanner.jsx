import { Billboard, Text } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useState } from 'react'

const STATUS_STYLES = {
  locked: { bg: '#e9961b', text: '#0a0a0a', icon: '🔒' },
  available: { bg: '#dfe20e', text: '#1a1a1a', icon: '📍' },
  complete: { bg: '#a645c4', text: '#ffffff', icon: '✓' },
}

const CLOSE_DISTANCE = 12 // below this, show the small eye-level tag instead of the roof banner

export default function QuestBanner({ building, label, status }) {
  const { camera } = useThree()
  const [isClose, setIsClose] = useState(false)

  if (!building) return null

  const style = STATUS_STYLES[status] || STATUS_STYLES.locked
  const roofY = (building.render_y || 0) + building.height * building.scale_correction + 1.2
  const eyeLevelY = (building.render_y || 0) + 1.8
  const centerX = building.render_x + building.scaled_width / 2
  const centerZ = building.render_z + building.scaled_depth / 2
  const frontZ = building.rotation_y === 180
    ? building.render_z + building.scaled_depth + 0.6
    : building.render_z - 0.6

  useFrame(() => {
    const dist = Math.hypot(camera.position.x - centerX, camera.position.z - centerZ)
    const close = dist < CLOSE_DISTANCE
    if (close !== isClose) setIsClose(close)
  })

  if (isClose) {
    return (
      <Billboard position={[centerX, eyeLevelY, frontZ]} renderOrder={999}>
        <mesh renderOrder={999}>
          <planeGeometry args={[1.6, 0.45]} />
          <meshBasicMaterial color={style.bg} transparent opacity={0.95} depthTest={false} />
        </mesh>
        <Text
          position={[0, 0, 0.01]} fontSize={0.18} color={style.text}
          anchorX="center" anchorY="middle" maxWidth={1.5}
          renderOrder={1000} material-depthTest={false}
        >
          {style.icon} {label}
        </Text>
      </Billboard>
    )
  }

  return (
    <Billboard position={[centerX, roofY, centerZ]}>
      <mesh>
        <planeGeometry args={[3.2, 0.8]} />
        <meshBasicMaterial color={style.bg} transparent opacity={0.9} />
      </mesh>
      <Text position={[0, 0, 0.01]} fontSize={0.32} color={style.text} anchorX="center" anchorY="middle" maxWidth={3}>
        {style.icon} {label}
      </Text>
    </Billboard>
  )
}