
import { useTexture, Text } from "@react-three/drei"

// Tropical light greens for beach coconuts
const TROP_COLORS = [
  "#7EC850", "#8FD455", "#96DC4A", "#A2D95F",
  "#6DBF4A", "#82CC50", "#99D460", "#75C748",
]

export default function Coconut({ position, vocab, colorIndex = 0 }) {
  const coconutTexture = useTexture("/coconut.png")
  const tintColor = TROP_COLORS[colorIndex % TROP_COLORS.length]
  const radius = 0.42

  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          map={coconutTexture}
          color={tintColor}
          roughness={0.88}
          metalness={0}
        />
      </mesh>

      {vocab?.thai && (
        <Text
          position={[0, 0, radius + 0.01]}
          fontSize={0.19}
          color="#1a3300"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.8}
          textAlign="center"
          outlineWidth={0.012}
          outlineColor="#00000055"
        >
          {vocab.thai}
        </Text>
      )}
    </group>
  )
}