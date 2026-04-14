/**
 * FallingCoconut — wrong answer only.
 * Drops from the tree crown to the sea surface, then sinks.
 */
import { useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { SEA_HIT_Y } from "../sceneConstants"

const SEA_Y         = SEA_HIT_Y
const FALL_DURATION = 2.0

export default function FallingCoconut({ startPos, onAnimationDone }) {
  const meshRef    = useRef()
  const startTime  = useRef(null)
  const doneCalled = useRef(false)

  useEffect(() => {
    startTime.current  = null
    doneCalled.current = false
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current || doneCalled.current) return

    const now = clock.getElapsedTime()
    if (startTime.current === null) startTime.current = now
    const elapsed = now - startTime.current

    // Gravity-like fall (ease-in quadratic)
    const t = Math.min(elapsed / FALL_DURATION, 1)
    const y = startPos[1] + (SEA_Y - startPos[1]) * (t * t)
    meshRef.current.position.set(startPos[0], y, startPos[2])
    meshRef.current.rotation.x += 0.05
    meshRef.current.rotation.z += 0.03

    // Once coconut hits sea level → sink and shrink (splash)
    if (t >= 1) {
      const sinkElapsed = elapsed - FALL_DURATION
      meshRef.current.position.y = SEA_Y - sinkElapsed * 2.8
      const s = Math.max(0, 1 - sinkElapsed * 2.0)
      meshRef.current.scale.setScalar(s)
      if (s <= 0) {
        doneCalled.current = true
        onAnimationDone?.()
      }
    }
  })

  return (
    <mesh ref={meshRef} position={new THREE.Vector3(...startPos)} castShadow>
      <sphereGeometry args={[0.42, 16, 16]} />
      <meshStandardMaterial color="#4a2c0a" roughness={0.9} metalness={0} />
    </mesh>
  )
}
