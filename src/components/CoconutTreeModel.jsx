import { useRef, useMemo, useState, useCallback } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import Coconut from "./Coconut"
import { VOCAB_TREE_MODEL_SCALE, VOCAB_CROWN_LOCAL } from "../sceneConstants"

const pseudoRandom = (seed) => {
  const value = Math.sin(seed * 127.1) * 43758.5453
  return value - Math.floor(value)
}

function isTrunkByName(mesh) {
  const n = (mesh.name || "").toLowerCase()
  return (
    n.includes("trunk") ||
    n.includes("stem") ||
    n.includes("bark") ||
    n.includes("stump") ||
    n.includes("log") ||
    n.includes("root")
  )
}

function isFoliageByName(mesh) {
  const n = (mesh.name || "").toLowerCase()
  if (isTrunkByName(mesh)) return false
  return (
    n.includes("leaf") ||
    n.includes("leaves") ||
    n.includes("frond") ||
    n.includes("foliage") ||
    n.includes("coconut_leaf") ||
    (n.includes("crown") && !n.includes("trunk"))
  )
}

function partitionCoconutTree(scene) {
  const full = scene.clone(true)
  full.updateMatrixWorld(true)
  const treeBox = new THREE.Box3().setFromObject(full)
  const trunkRoot = new THREE.Group()
  const foliageRoot = new THREE.Group()

  const meshes = []
  full.traverse((o) => {
    if (o.isMesh) meshes.push(o)
  })

  for (const mesh of meshes) {
    // Fix black-backface artefact: GLB materials default to FrontSide only
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => { m.side = THREE.DoubleSide })
    }

    if (mesh.isSkinnedMesh) {
      trunkRoot.attach(mesh)
      continue
    }
    if (isFoliageByName(mesh)) {
      foliageRoot.attach(mesh)
      continue
    }
    if (isTrunkByName(mesh)) {
      trunkRoot.attach(mesh)
      continue
    }
    mesh.updateMatrixWorld(true)
    const mBox = new THREE.Box3().setFromObject(mesh)
    const cy = (mBox.min.y + mBox.max.y) / 2
    const tMin = treeBox.min.y
    const tH = Math.max(treeBox.max.y - treeBox.min.y, 0.02)
    if (cy > tMin + tH * 0.48) foliageRoot.attach(mesh)
    else trunkRoot.attach(mesh)
  }

  if (foliageRoot.children.length === 0 && trunkRoot.children.length > 0) {
    const list = [...trunkRoot.children]
    const withY = list.map((m) => {
      m.updateMatrixWorld(true)
      const b = new THREE.Box3().setFromObject(m)
      return { m, cy: (b.min.y + b.max.y) / 2 }
    })
    withY.sort((a, b) => b.cy - a.cy)
    const take = Math.max(1, Math.floor(withY.length / 2))
    for (let i = 0; i < take; i++) {
      foliageRoot.attach(withY[i].m)
    }
  }

  return { trunkRoot, foliageRoot }
}

export default function CoconutTreeModel({
  coconutCount = 0,
  vocabularies = [],
  position = [0, -20, 0],
  onTreeClick,
  collectedIds = new Set(),
}) {
  const { scene } = useGLTF("/coconut_tree.glb")

  const { trunkRoot, foliageRoot } = useMemo(
    () => partitionCoconutTree(scene),
    [scene]
  )

  const swayRef = useRef()
  const [isShaking, setIsShaking] = useState(false)

  const windPhase = useMemo(
    () => position[0] * 0.6 + position[2] * 0.4,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position[0], position[2]]
  )

  const availableVocabs = useMemo(
    () => vocabularies.filter((v) => !collectedIds.has(v?.$id)),
    [vocabularies, collectedIds]
  )

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      if (!onTreeClick || availableVocabs.length === 0) return
      const vocab = availableVocabs[Math.floor(Math.random() * availableVocabs.length)]
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 900)
      onTreeClick(vocab, position)
    },
    [onTreeClick, availableVocabs, position]
  )

  useFrame(({ clock }) => {
    if (!swayRef.current) return
    const t = clock.getElapsedTime()
    if (isShaking) {
      swayRef.current.rotation.z = Math.sin(t * 18) * 0.14 + Math.sin(t * 13) * 0.09
      swayRef.current.rotation.x = Math.sin(t * 15) * 0.07
    } else {
      const sway =
        Math.sin(t * 1.05 + windPhase) * 0.036 +
        Math.sin(t * 0.62 + windPhase * 1.3) * 0.02 +
        Math.sin(t * 1.95 + windPhase * 0.7) * 0.008
      swayRef.current.rotation.z = sway
      swayRef.current.rotation.x = Math.sin(t * 0.75 + windPhase + 0.5) * 0.012
    }
  })

  const totalCoconuts = coconutCount || vocabularies.length || 0
  const [cx, cy, cz] = VOCAB_CROWN_LOCAL
  const coconuts = []

  for (let i = 0; i < totalCoconuts; i++) {
    const vocab = vocabularies[i]
    if (collectedIds.has(vocab?.$id)) continue

    const baseAngle = (i / totalCoconuts) * Math.PI * 2
    const jA = pseudoRandom(i + 401)
    const jB = pseudoRandom(i + 701)
    const jC = pseudoRandom(i + 1001)
    const angle = baseAngle + (jA - 0.5) * 0.9
    const r = 0.42 + (jB - 0.5) * 0.24
    const x = cx + Math.cos(angle) * r
    const z = cz + Math.sin(angle) * r
    const y = cy - 0.35 + (jC - 0.5) * 0.32

    const hue = Math.floor(pseudoRandom(i + 1301) * 360)
    const sat = 55 + Math.floor(pseudoRandom(i + 1401) * 25)
    const light = 38 + Math.floor(pseudoRandom(i + 1501) * 18)
    coconuts.push(
      <Coconut
        key={vocab?.$id || i}
        position={[x, y, z]}
        vocab={{ ...vocab, color: `hsl(${hue} ${sat}% ${light}%)` }}
      />
    )
  }

  return (
    <group
      position={position}
      scale={VOCAB_TREE_MODEL_SCALE}
      onClick={handleClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        document.body.style.cursor = "grab"
      }}
    >
      <primitive object={trunkRoot} castShadow receiveShadow />
      <group ref={swayRef}>
        <primitive object={foliageRoot} castShadow receiveShadow />
        {coconuts}
      </group>
    </group>
  )
}

useGLTF.preload("/coconut_tree.glb")
