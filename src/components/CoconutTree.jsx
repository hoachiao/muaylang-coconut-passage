import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import Coconut from "./Coconut"
import CoconutLeaf from "./CoconutLeaf"
import TreeTrunk from "./TreeTrunk"

const pseudoRandom = (seed) => {
  const value = Math.sin(seed * 127.1) * 43758.5453
  return value - Math.floor(value)
}

export default function CoconutTree({ coconutCount, vocabularies = [], position = [0, -2, 0] }) {
  const crownRef = useRef()

  // 每棵樹有獨立的風相位，避免所有樹同步搖擺
  const windPhase = useMemo(
    () => position[0] * 0.6 + position[2] * 0.4,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position[0], position[2]]
  )

  useFrame(({ clock }) => {
    if (!crownRef.current) return
    const t = clock.getElapsedTime()
    // 多頻率疊加，模擬陣風感
    const sway =
      Math.sin(t * 1.10 + windPhase) * 0.042 +
      Math.sin(t * 0.65 + windPhase * 1.3) * 0.022 +
      Math.sin(t * 2.10 + windPhase * 0.7) * 0.008
    crownRef.current.rotation.z = sway
    crownRef.current.rotation.x = Math.sin(t * 0.80 + windPhase + 0.5) * 0.018
  })

  const coconuts = []

  const upperLeafCount = 15
  const lowerLeafCount = 15
  const coconutBaseRadius = 0.55
  const trunkHeight = 15
  const trunkBaseY = 1.2
  const crownCenterY = trunkBaseY + trunkHeight / 2 + 0.3

  for (let i = 0; i < coconutCount; i++) {
    const baseAngle = (i / coconutCount) * Math.PI * 2
    const jitterA = pseudoRandom(i + 401)
    const jitterB = pseudoRandom(i + 701)
    const jitterC = pseudoRandom(i + 1001)
    const angle = baseAngle + (jitterA - 0.5) * 0.9
    const radius = coconutBaseRadius + (jitterB - 0.5) * 0.55
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = crownCenterY - 0.2 + (jitterC - 0.5) * 0.9

    coconuts.push(<Coconut key={i} position={[x, y, z]} vocab={vocabularies[i]} colorIndex={i} />)
  }

  return (
    <group position={position}>
      <TreeTrunk
        position={[0, trunkBaseY, 0]}
        radiusTop={0.4}
        radiusBottom={0.4}
        height={trunkHeight}
      />

      {/* 樹冠整體隨風搖擺 */}
      <group ref={crownRef}>
        {/* Upper leaves */}
        {Array.from({ length: upperLeafCount }).map((_, i) => {
          const angle = (i / upperLeafCount) * Math.PI * 2
          const randomA = pseudoRandom(i + 2222)
          const randomB = pseudoRandom(i + 1012)
          const radius = 0.95 + randomA * 0.35
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius
          const outwardYaw = angle + Math.PI / 2
          const pitch = 0.15 + randomB * 0.75
          const roll = 0.1 + randomA * 2.5
          const lengthScale = 0.85 + randomB * 0.25

          return (
            <CoconutLeaf
              key={`upper-leaf-${i}`}
              position={[x, crownCenterY + randomA * 2, z]}
              rotation={[pitch, outwardYaw, roll]}
              scale={[1, 1, lengthScale]}
              size={[2.8, 4, 2.8]}
              color="#2f8f3a"
              roughness={0.88}
            />
          )
        })}

        {/* Lower leaves */}
        {Array.from({ length: lowerLeafCount }).map((_, i) => {
          const angle = (i / lowerLeafCount) * Math.PI * 2
          const randomA = pseudoRandom(i + 201)
          const randomB = pseudoRandom(i + 301)
          const radius = 1.35 + randomA * 0.45
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius
          const outwardYaw = angle + Math.PI / 2
          const pitch = -0.35 - randomB * 0.35
          const roll = -0.25 + randomA * 0.5
          const lengthScale = 1 + randomB * 0.45

          return (
            <CoconutLeaf
              key={`lower-leaf-${i}`}
              position={[x, crownCenterY - 0.8, z]}
              rotation={[pitch, outwardYaw, roll]}
              scale={[1, 1, lengthScale]}
              size={[2.8, 4, 2.8]}
              color="#2b7f35"
              roughness={0.9}
            />
          )
        })}

        {coconuts}
      </group>
    </group>
  )
}
