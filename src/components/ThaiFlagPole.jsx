import { useMemo, useRef, useLayoutEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const RED   = "#c41e3a"
const WHITE = "#f5f5f5"
const BLUE  = "#1a237e"

// Stripe proportions: 1 red, 1 white, 2 blue, 1 white, 1 red  (total 6 parts)
const STRIPE_PARTS = [
  { color: RED,   parts: 1 },
  { color: WHITE, parts: 1 },
  { color: BLUE,  parts: 2 },
  { color: WHITE, parts: 1 },
  { color: RED,   parts: 1 },
]
const TOTAL_PARTS = 6

// Subdivisions — more cols = smoother horizontal ripple
const COLS = 28
const ROWS = 12

/**
 * One flag stripe rendered as a subdivided PlaneGeometry with per-vertex cloth animation.
 * xOffset   : local X offset inside the flag group (0 = pole edge)
 * yOffset   : local Y offset (bottom of this stripe)
 * w, h      : world dimensions of this stripe
 * windPhase : per-pole phase offset so neighbouring poles don't sync perfectly
 */
function FlagStripe({ xOffset, yOffset, w, h, color, windPhase }) {
  const meshRef = useRef(null)
  const baseRef = useRef(null)

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, COLS, ROWS)
    return g
  }, [w, h])

  // Snapshot the rest-positions once after geometry is built
  useLayoutEffect(() => {
    const pos = geom.attributes.position
    baseRef.current = new Float32Array(pos.array)
  }, [geom])

  useFrame(({ clock }) => {
    if (!meshRef.current || !baseRef.current) return
    const t    = clock.getElapsedTime()
    const pos  = meshRef.current.geometry.attributes.position
    const base = baseRef.current
    const n    = pos.count

    for (let i = 0; i < n; i++) {
      const ix = i * 3
      const bx = base[ix]     // rest X (−w/2 … +w/2 in local space)
      const by = base[ix + 1]
      // Normalised distance from pole edge (0 at pole, 1 at free end)
      const t_x = (bx + w / 2) / w   // 0 → 1

      // Amplitude grows quadratically away from the pole
      const amp = t_x * t_x * w * 0.14

      // Phase advances from pole to free end (wave travels rightward)
      const phase = t_x * Math.PI * 2.2

      const wave =
        Math.sin(t * 2.1  + phase + windPhase)          * amp        +
        Math.sin(t * 3.4  + phase * 1.6 + windPhase)    * amp * 0.38 +
        Math.sin(t * 1.25 + phase * 0.7 + windPhase)    * amp * 0.22

      // Secondary vertical ripple (smaller)
      const vAmp   = t_x * h * 0.04
      const vPhase = (by / h) * Math.PI + windPhase
      const vWave  = Math.sin(t * 2.8 + vPhase) * vAmp

      pos.setXYZ(i, bx, by + vWave, wave)
    }

    pos.needsUpdate = true
    meshRef.current.geometry.computeVertexNormals()
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geom}
      position={[xOffset + w / 2, yOffset + h / 2, 0]}
      castShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default function ThaiFlagPole({
  position   = [0, 0, 0],
  poleHeight = 2.85,
  flagWidth  = 1.38,
}) {
  const flagH    = flagWidth * (2 / 3)
  const unitH    = flagH / TOTAL_PARTS

  const windPhase = useMemo(
    () => position[0] * 0.31 + position[2] * 0.27,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position[0], position[2]]
  )

  // Y of flag bottom relative to pole base
  const flagBottomY = poleHeight - flagH - 0.12
  // X of flag left edge relative to pole centre
  const flagLeftX   = 0.06

  let yCursor = 0
  const stripes = STRIPE_PARTS.map((s, i) => {
    const stripeH = unitH * s.parts
    const y = yCursor
    yCursor += stripeH
    return (
      <FlagStripe
        key={i}
        xOffset={flagLeftX}
        yOffset={flagBottomY + y}
        w={flagWidth}
        h={stripeH}
        color={s.color}
        windPhase={windPhase}
      />
    )
  })

  return (
    <group position={position}>
      {/* Wooden pole */}
      <mesh position={[0, poleHeight * 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.055, 0.072, poleHeight, 12]} />
        <meshStandardMaterial color="#4a3220" roughness={0.93} metalness={0} />
      </mesh>

      {stripes}
    </group>
  )
}
