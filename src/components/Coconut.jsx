
import { useTexture } from "@react-three/drei"

export default function Coconut({ position }) {
  const coconutTexture = useTexture("/coconut.png")

  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial map={coconutTexture} roughness={0.92} metalness={0} />
    </mesh>
  )
}