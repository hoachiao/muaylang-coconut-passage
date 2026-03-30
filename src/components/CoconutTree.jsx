import Coconut from "./Coconut"
import CoconutLeaf from "./CoconutLeaf"
import TreeTrunk from "./TreeTrunk"

const pseudoRandom = (seed) => {
  const value = Math.sin(seed * 127.1) * 43758.5453
  return value - Math.floor(value)
}

export default function CoconutTree({ coconutCount }) {
  const coconuts = []

  const upperLeafCount = 10
  const lowerLeafCount = 10
  const coconutBaseRadius = 0.55
  const crownCenterY = 5.5

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

    coconuts.push(<Coconut key={i} position={[x, y, z]} />)
  }

  return (
    <group position={[0, -2, 10]}>
      <TreeTrunk position={[0, 1.2, 0]} radiusTop={0.4} radiusBottom={0.4} height={9} />

    
      {/* Upper leaves: medium ring around coconut center */}
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

      {/* Lower leaves: longer, wider, and droopy */}
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
  )
}