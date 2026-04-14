import { useMemo } from "react"
import { useGLTF } from "@react-three/drei"

export default function ThaiStiltHouseModel({
  position = [-10, -2.35, 1],
  rotation = [0, Math.PI * 0.08, 0],
  scale = [1, 1, 1],
}) {
  const { scene } = useGLTF("/thai_stilt_house.glb")

  // clone 一份避免多次使用同一個 scene 實例
  const model = useMemo(() => scene.clone(), [scene])

  return <primitive object={model} position={position} rotation={rotation} scale={scale} />
}

useGLTF.preload("/thai_stilt_house.glb")

