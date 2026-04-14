/**
 * BoatController (first-person, step-based movement)
 * - Camera locked to boat at eye level
 * - Mouse drag: look around; arrow keys: move (only when stepsAvailable > 0)
 * - visibleCoconuts: vocab objects sitting on deck, each rendered with Thai label
 */
import { useRef, useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useGLTF, Text } from "@react-three/drei"
import * as THREE from "three"
import { WATER_SURFACE_Y, MOVE_STEP, SHORE_LINE_Z } from "../sceneConstants"
const TURN_STEP  = Math.PI / 8
const MOUSE_SENS = 0.0025
const EYE_HEIGHT = 2.2
const MIN_PITCH  = -Math.PI / 3
const MAX_PITCH  =  Math.PI / 5

// Deck positions in boat-local space; coconuts sit at y=1.5 (visible in lower view)
const DECK_SLOTS = [
  [ 0.00, 1.5, -1.3],
  [-0.28, 1.5, -1.1],
  [ 0.28, 1.5, -1.1],
  [-0.14, 1.5, -1.6],
  [ 0.14, 1.5, -1.6],
]

export default function BoatController({ stepsAvailable = 0, onStepTaken, visibleCoconuts = [], startZ = 19, onArrived }) {
  const { camera, gl } = useThree()
  const { scene } = useGLTF("/boat.glb")
  const boatClone = useMemo(() => scene.clone(true), [scene])
  const boatRef        = useRef()
  const paddleGroupRef = useRef()
  const rowPhaseRef    = useRef(0)
  const rowBlendRef    = useRef(0)

  const pos      = useRef(new THREE.Vector3(0, WATER_SURFACE_Y + 0.1, startZ))
  const boatYaw  = useRef(0)
  const camYaw   = useRef(0)
  const camPitch = useRef(-0.05)
  const drag     = useRef({ active: false, x: 0, y: 0 })

  const stepsRef    = useRef(stepsAvailable)
  const onStepRef   = useRef(onStepTaken)
  const onArrivedRef = useRef(onArrived)
  const arrivedRef  = useRef(false)
  useEffect(() => { stepsRef.current = stepsAvailable }, [stepsAvailable])
  useEffect(() => { onStepRef.current = onStepTaken }, [onStepTaken])
  useEffect(() => { onArrivedRef.current = onArrived }, [onArrived])

  useEffect(() => { camera.rotation.order = "YXZ" }, [camera])

  const rowSoundRef   = useRef(null)
  const rowKeysHeld   = useRef(new Set())
  const oceanSoundRef = useRef(null)

  // ── Ocean ambient background ──────────────────────────────
  useEffect(() => {
    const audio = new Audio("/ocean-waves.mp3")
    audio.loop   = true
    audio.volume = 0.28
    oceanSoundRef.current = audio

    const tryPlay = () => audio.play().catch(() => {})
    tryPlay()

    // Retry on first user interaction if browser blocked autoplay
    const onInteract = () => tryPlay()
    window.addEventListener("pointerdown", onInteract, { once: true })
    window.addEventListener("keydown",     onInteract, { once: true })

    return () => {
      audio.pause()
      audio.src = ""
      oceanSoundRef.current = null
      window.removeEventListener("pointerdown", onInteract)
      window.removeEventListener("keydown",     onInteract)
    }
  }, [])

  // ── Rowing sound ─────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio("/river-flow.mp3")
    audio.loop = true
    audio.volume = 0.85
    rowSoundRef.current = audio
    return () => {
      audio.pause()
      audio.src = ""
      rowSoundRef.current = null
    }
  }, [])

  useEffect(() => {
    if (stepsAvailable <= 0) {
      rowKeysHeld.current.clear()
      const a = rowSoundRef.current
      if (a) {
        a.pause()
        a.currentTime = 0
      }
    }
  }, [stepsAvailable])

  useEffect(() => {
    const playRowSoundIfNeeded = () => {
      const a = rowSoundRef.current
      if (!a || stepsRef.current <= 0) return
      if (!rowKeysHeld.current.has("ArrowUp") && !rowKeysHeld.current.has("ArrowDown")) return
      a.play().catch(() => {})
    }

    const stopRowSoundIfIdle = () => {
      const a = rowSoundRef.current
      if (!a) return
      if (rowKeysHeld.current.has("ArrowUp") || rowKeysHeld.current.has("ArrowDown")) return
      a.pause()
      a.currentTime = 0
    }

    const onKeyDown = (e) => {
      if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        if (stepsRef.current > 0 && !arrivedRef.current) {
          rowKeysHeld.current.add(e.code)
          playRowSoundIfNeeded()
        }
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) return
      e.preventDefault()
      if (stepsRef.current <= 0) return

      if (e.code === "ArrowLeft") {
        boatYaw.current += TURN_STEP; camYaw.current += TURN_STEP
      } else if (e.code === "ArrowRight") {
        boatYaw.current -= TURN_STEP; camYaw.current -= TURN_STEP
      } else if (e.code === "ArrowUp") {
        if (arrivedRef.current) return
        const nextX = pos.current.x - Math.sin(boatYaw.current) * MOVE_STEP
        const nextZ = pos.current.z - Math.cos(boatYaw.current) * MOVE_STEP
        if (nextZ <= SHORE_LINE_Z) {
          pos.current.x = nextX
          pos.current.z = SHORE_LINE_Z
          arrivedRef.current = true
          rowKeysHeld.current.clear()
          const a = rowSoundRef.current
          if (a) { a.pause(); a.currentTime = 0 }
          onArrivedRef.current?.()
        } else {
          pos.current.x = nextX
          pos.current.z = nextZ
        }
      } else if (e.code === "ArrowDown") {
        pos.current.x += Math.sin(boatYaw.current) * MOVE_STEP
        pos.current.z += Math.cos(boatYaw.current) * MOVE_STEP
      }
      onStepRef.current?.()
    }

    const onKeyUp = (e) => {
      if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        rowKeysHeld.current.delete(e.code)
        stopRowSoundIfIdle()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.style.cursor = "grab"
    const onDown = (e) => { drag.current = { active: true, x: e.clientX, y: e.clientY }; canvas.style.cursor = "grabbing" }
    const onMove = (e) => {
      if (!drag.current.active) return
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      drag.current.x = e.clientX; drag.current.y = e.clientY
      camYaw.current -= dx * MOUSE_SENS
      camPitch.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, camPitch.current - dy * MOUSE_SENS))
    }
    const onUp = () => { drag.current.active = false; canvas.style.cursor = "grab" }
    canvas.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      canvas.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [gl])

  useFrame(({ clock }, delta) => {
    const t    = clock.getElapsedTime()
    const bob  = Math.sin(t * 0.90) * 0.06
    const roll = Math.sin(t * 0.70) * 0.018
    const wPit = Math.sin(t * 0.52 + 1.0) * 0.010

    if (boatRef.current) {
      boatRef.current.position.set(pos.current.x, pos.current.y + bob, pos.current.z)
      boatRef.current.rotation.order = "YXZ"
      boatRef.current.rotation.y = boatYaw.current
      boatRef.current.rotation.z = roll
      boatRef.current.rotation.x = wPit
    }

    camera.rotation.order = "YXZ"
    camera.rotation.y = camYaw.current
    camera.rotation.x = camPitch.current + wPit
    camera.rotation.z = roll * 0.15
    camera.position.set(pos.current.x, pos.current.y + EYE_HEIGHT + bob, pos.current.z)

    // ── Paddle animation ──────────────────────────────────────────
    const audioEl = rowSoundRef.current
    const isAudioPlaying = !!(audioEl && !audioEl.paused && audioEl.duration > 0)

    // Sync phase directly to audio playhead so animation locks to sound
    if (isAudioPlaying) {
      rowPhaseRef.current = (audioEl.currentTime / audioEl.duration) * Math.PI * 2
    } else if (rowPhaseRef.current > 0) {
      // Let the current stroke finish naturally before returning to rest
      rowPhaseRef.current += delta * 3.8
      if (rowPhaseRef.current >= Math.PI * 2) rowPhaseRef.current = 0
    }

    // Blend 0=rest (横躺) → 1=rowing, smooth 0.18s ramp
    const rowingActive = isAudioPlaying || rowPhaseRef.current > 0
    rowBlendRef.current = THREE.MathUtils.lerp(
      rowBlendRef.current, rowingActive ? 1 : 0, Math.min(1, delta * 8)
    )

    if (paddleGroupRef.current) {
      const p     = rowPhaseRef.current
      const blend = rowBlendRef.current

      // Camera right / forward unit vectors in XZ plane
      const sinY = Math.sin(camYaw.current)
      const cosY = Math.cos(camYaw.current)
      const rx = cosY,  rz = -sinY
      const fx = -sinY, fz = -cosY

      // Stroke X-rotation: dips forward on entry (0→π), pulls back on exit (π→2π)
      const strokeTilt = Math.sin(p) * 0.68
      // Recovery arc: blade rises slightly as paddle swings back above water
      const vertArc    = Math.max(0, -Math.sin(p)) * 0.14

      // Rest pose: paddle lying on boat gunwale (low, leaning right)
      const restRight = 0.22, restFwd = 0.38
      const rowRight  = 0.52, rowFwd  = 0.60
      const fr = restRight + (rowRight - restRight) * blend
      const ff = restFwd  + (rowFwd  - restFwd)  * blend

      const restY = pos.current.y + 0.82 + bob
      const rowY  = pos.current.y + EYE_HEIGHT + bob - 0.70 + vertArc
      const finalY = restY + (rowY - restY) * blend

      paddleGroupRef.current.position.set(
        pos.current.x + rx * fr + fx * ff,
        finalY,
        pos.current.z + rz * fr + fz * ff
      )
      paddleGroupRef.current.rotation.order = "YXZ"
      paddleGroupRef.current.rotation.y = camYaw.current + 0.22
      // Rest: X≈-π/2+0.3 (horizontal) → Rowing: normal stroke tilt
      paddleGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        camPitch.current - Math.PI / 2 + 0.30,
        camPitch.current - 0.26 + strokeTilt,
        blend
      )
      // Rest: Z≈1.25 (laid on side) → Rowing: slight lean with wave roll
      paddleGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        1.25,
        roll * 0.55 + 0.16 + Math.cos(p) * 0.06,
        blend
      )
    }
  })

  const slotCount = Math.min(visibleCoconuts.length, DECK_SLOTS.length)

  return (
    <>
      <group ref={boatRef}>
        <primitive object={boatClone} castShadow receiveShadow />

        {/* Collected coconuts on deck, each showing its Thai word */}
        {DECK_SLOTS.slice(0, slotCount).map((slotPos, i) => {
          const vocab = visibleCoconuts[i]
          return (
            <group key={i} position={slotPos}>
              <mesh castShadow>
                <sphereGeometry args={[0.19, 14, 14]} />
                <meshStandardMaterial color="#3d2008" roughness={0.92} metalness={0} />
              </mesh>
              {vocab?.thai && (
                <Text
                  position={[0, 0.30, 0]}
                  fontSize={0.13}
                  color="#ffe066"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.018}
                  outlineColor="rgba(0,0,0,0.7)"
                  maxWidth={0.7}
                  textAlign="center"
                >
                  {vocab.thai}
                </Text>
              )}
            </group>
          )
        })}
      </group>

      {/* ── First-person paddle ── */}
      <group ref={paddleGroupRef}>
        {/* Shaft — shorter */}
        <mesh position={[0, 0.34, 0]} castShadow>
          <cylinderGeometry args={[0.024, 0.030, 1.20, 8]} />
          <meshStandardMaterial color="#c8a850" roughness={0.80} metalness={0.04} />
        </mesh>
        {/* Blade */}
        <mesh position={[0, -0.28, 0.012]} castShadow>
          <boxGeometry args={[0.18, 0.38, 0.022]} />
          <meshStandardMaterial color="#b08830" roughness={0.84} metalness={0.02} />
        </mesh>
        {/* Blade tip */}
        <mesh position={[0, -0.48, 0.012]} castShadow>
          <cylinderGeometry args={[0.0, 0.082, 0.10, 8]} />
          <meshStandardMaterial color="#b08830" roughness={0.84} metalness={0.02} />
        </mesh>
      </group>
    </>
  )
}

useGLTF.preload("/boat.glb")
