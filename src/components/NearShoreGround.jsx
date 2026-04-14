import { useMemo } from "react"
import * as THREE from "three"
import { WATER_SURFACE_Y } from "../sceneConstants"
import ThaiFlagPole from "./ThaiFlagPole"

function mulberry32(a0) {
  let a = a0 >>> 0
  return function rand() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Sand strip + scattered rocks between open water and the distant shore row.
 */
export default function NearShoreGround() {
  const rocks = useMemo(() => {
    const rnd = mulberry32(77231)
    const list = []
    for (let i = 0; i < 32; i++) {
      list.push({
        x: (rnd() - 0.5) * 104,
        z: (rnd() - 0.5) * 19,
        s: 0.12 + rnd() * 0.45,
        ry: rnd() * Math.PI * 2,
        rx: (rnd() - 0.5) * 0.28,
        geo: rnd() > 0.55 ? "dodecahedron" : "icosahedron",
      })
    }
    return list
  }, [])

  const sandY = WATER_SURFACE_Y + 0.11
  /** World-Z center of band: between boat side and distant row */
  const bandZ = -7.5

  return (
    <group position={[0, sandY, bandZ]}>
      {/* Extended land — covers area behind the distant shore so no sea shows through */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -100.5]} receiveShadow>
        <planeGeometry args={[300, 224]} />
        <meshStandardMaterial
          color="#e4d4bc"
          roughness={0.96}
          metalness={0}
          envMapIntensity={0.35}
        />
      </mesh>

      {/* Twin entrance flags flanking the arrival point — tall enough to be visible from starting distance */}
      <ThaiFlagPole position={[0, 0.02, 14]} poleHeight={12} flagWidth={5.5} />

      {rocks.map((r, i) => (
        <mesh
          key={i}
          position={[r.x, r.s * 0.38, r.z]}
          rotation={[r.rx, r.ry, 0]}
          castShadow
          receiveShadow
        >
          {r.geo === "dodecahedron" ? (
            <dodecahedronGeometry args={[r.s, 0]} />
          ) : (
            <icosahedronGeometry args={[r.s * 0.92, 0]} />
          )}
          <meshStandardMaterial
            color={new THREE.Color().setHSL(0.08, 0.04, 0.28 + (i % 5) * 0.04)}
            roughness={0.91}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  )
}
