import { useMemo, useRef, useLayoutEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const WATER_COLOR = new THREE.Color("#2ec4e0")
const WATER_DEEP  = new THREE.Color("#0a7f9c")

function WindWaterSurface() {
  const meshRef = useRef(null)
  const baseRef = useRef(null)

  const geom = useMemo(() => {
    // More segments → smoother large swells
    const g = new THREE.PlaneGeometry(420, 500, 90, 70)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  useLayoutEffect(() => {
    const pos  = geom.attributes.position
    const copy = new Float32Array(pos.array.length)
    copy.set(pos.array)
    baseRef.current = copy
  }, [geom])

  useFrame(({ clock }) => {
    if (!meshRef.current || !baseRef.current) return
    const t   = clock.getElapsedTime()
    const pos = meshRef.current.geometry.attributes.position
    const base = baseRef.current
    const n   = pos.count

    for (let i = 0; i < n; i++) {
      const ix = i * 3
      const bx = base[ix]
      const by = base[ix + 1]
      const bz = base[ix + 2]

      // ── Primary ocean swell (long, slow, high-amplitude) ──────────
      const swell1 =
        Math.sin(bx * 0.055 + bz * 0.02  + t * 0.72) * 0.52
      const swell2 =
        Math.sin(bx * 0.03  + bz * 0.065 + t * 0.58) * 0.44

      // ── Secondary cross-chop ──────────────────────────────────────
      const chop1 =
        Math.sin(bx * 0.14  + bz * 0.08  + t * 1.15) * 0.18
      const chop2 =
        Math.sin(bx * 0.09  + bz * 0.17  + t * 1.40) * 0.14

      // ── Fine surface ripple ───────────────────────────────────────
      const ripple =
        Math.sin((bx + bz) * 0.32 + t * 2.1) * 0.05 +
        Math.sin(bx * 0.48  - bz * 0.22 + t * 2.8) * 0.03

      const w = swell1 + swell2 + chop1 + chop2 + ripple

      pos.setXYZ(i, bx, by + w, bz)
    }

    pos.needsUpdate = true
    // Recompute every frame so normals track the larger swells properly
    meshRef.current.geometry.computeVertexNormals()
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geom}
      position={[0, 0.04, 50]}
      renderOrder={1}
      receiveShadow
    >
      <meshPhysicalMaterial
        color={WATER_COLOR}
        transparent
        opacity={0.72}
        roughness={0.18}
        metalness={0.04}
        transmission={0.28}
        thickness={1.2}
        ior={1.33}
        attenuationColor={WATER_DEEP}
        attenuationDistance={2.8}
        envMapIntensity={2.2}
        clearcoat={0.45}
        clearcoatRoughness={0.18}
        depthWrite
        polygonOffset
        polygonOffsetFactor={2}
        polygonOffsetUnits={2}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default function Sea({ position = [0, 0, 0], scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <WindWaterSurface />
    </group>
  )
}
