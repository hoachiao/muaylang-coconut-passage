import { Canvas } from "@react-three/fiber"
import { Environment, OrbitControls } from "@react-three/drei"
import { Euler } from "three"
import CoconutTree from "./components/CoconutTree"



export default function Scene() {
  return (
    <Canvas
      camera={{ position: [5, 15, 8], fov: 90, shadows: true }}
      style={{ width: "100vw", height: "100vh" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} castShadow intensity={1.2} />

      

      {/* <Island /> */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[3, 32]} />
        <shadowMaterial opacity={0.3} />
      </mesh>

      <CoconutTree coconutCount={12} />
      <Environment
        files="/sea_background.hdr"
        background
        backgroundRotation={new Euler(25, 35,0)}
      />
      <OrbitControls
        minPolarAngle={1}
        maxPolarAngle={Math.PI / 2 - 0.5}
        minAzimuthAngle={1.2}
      />
    </Canvas>
  )
}