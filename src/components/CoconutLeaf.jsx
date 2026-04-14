import { useTexture } from "@react-three/drei"
import { DoubleSide } from "three"

export default function CoconutLeaf({
  position,
  rotation,
  scale = [1, 1, 1],
  color = "#ffffff",
  roughness = 0.92,
  size = [2, 0.2, 4.4],
}) {
  const leafTexture = useTexture("/coconutLeaf.png")
  const width = size[2]
  const length = size[5]

  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
    >
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial
        map={leafTexture}
        alphaMap={leafTexture}
        transparent
        alphaTest={0.2}
        depthWrite={false}
        color={color}
        roughness={roughness}
        side={DoubleSide}
      />
    </mesh>
  )
}
