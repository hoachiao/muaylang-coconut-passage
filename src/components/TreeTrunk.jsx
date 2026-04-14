import { useMemo } from "react"
import { useTexture } from "@react-three/drei"
import { RepeatWrapping, SRGBColorSpace } from "three"

export default function TreeTrunk({
  position = [0, 1.2, 0],
  radiusTop = 0.4,
  radiusBottom = 0.4,
  height = 9,
  radialSegments = 24,
}) {
  const trunkTexture = useTexture("/treeTrunk.png")
  const trunkMapA = useMemo(() => {
    const texture = trunkTexture.clone()
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(0.1, 3)
    texture.offset.set(0.2, 0)
    texture.needsUpdate = true
    return texture
  }, [trunkTexture])

  const trunkMapB = useMemo(() => {
    const texture = trunkTexture.clone()
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(0.9, 3.1)
    texture.offset.set(0.03, 0.02)
    texture.needsUpdate = true
    return texture
  }, [trunkTexture])
  return (
    <group position={position}>
      {/* Core trunk: 單一圓柱，沒有分節 */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radiusTop, radiusBottom, height, radialSegments]} />
        <meshStandardMaterial map={trunkMapA} roughness={0.95} metalness={0} />
      </mesh>

      {/* 外層樹皮薄殼，減少貼圖接縫感 */}
      <mesh rotation={[0, Math.PI / 9, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[radiusTop * 1.03, radiusBottom * 1.03, height * 0.995, radialSegments + 4]}
        />
        <meshStandardMaterial
          map={trunkMapB}
          roughness={0.98}
          metalness={0}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  )
}
