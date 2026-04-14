import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF, useTexture } from "@react-three/drei"
import * as THREE from "three"
import {
  WATER_SURFACE_Y,
  DISTANT_ROW_Z,
  DISTANT_ROW_START_X,
  DISTANT_SLOT_SPACING,
} from "../sceneConstants"

const HOUSE_WORLD_HEIGHT = 4.8

function mulberry32(a0) {
  let a = a0 >>> 0
  return function rand() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const KIND_CYCLE = ["long", "one", "tree", "long", "tree", "one", "tree", "one"]

function buildRowLayout(seed, count) {
  const rnd = mulberry32(seed)
  const items = []
  for (let i = 0; i < count; i++) {
    const x =
      DISTANT_ROW_START_X +
      i * DISTANT_SLOT_SPACING +
      (rnd() - 0.5) * 0.14
    const kind = KIND_CYCLE[i % KIND_CYCLE.length]
    const scale = 0.9 + rnd() * 0.12
    const rotY = (rnd() - 0.5) * 0.07
    items.push({ id: `d-${i}`, kind, x, z: DISTANT_ROW_Z, scale, rotY })
  }
  return items
}

/**
 * All distant houses in one useFrame (no per-mesh drei Billboard) — less CPU, stable depth.
 */
function BatchedDistantHouses({ entries, matLong, matOne, unitGeom }) {
  const refs = useRef([])

  useFrame(({ camera }) => {
    const yBase = WATER_SURFACE_Y + 0.08
    for (let i = 0; i < entries.length; i++) {
      const grp = refs.current[i]
      const e = entries[i]
      if (!grp || !e) continue
      grp.position.set(e.x, yBase + e.halfH, e.z)
      grp.rotation.x = 0
      grp.rotation.z = 0
      grp.rotation.y = Math.atan2(
        camera.position.x - e.x,
        camera.position.z - e.z
      )
    }
  })

  return (
    <>
      {entries.map((e, i) => (
        <group key={e.id} ref={(r) => { refs.current[i] = r }} renderOrder={4}>
          <mesh
            geometry={unitGeom}
            material={e.kind === "long" ? matLong : matOne}
            scale={[e.width, e.height, 1]}
            castShadow
            receiveShadow
          />
        </group>
      ))}
    </>
  )
}

export default function DistantShoreDecor({ seed = 90210, count = 26 }) {
  const { scene } = useGLTF("/coconut_tree.glb")
  const longMap = useTexture("/long_house.png")
  const oneMap = useTexture("/one_house.png")

  longMap.colorSpace = THREE.SRGBColorSpace
  oneMap.colorSpace = THREE.SRGBColorSpace

  const layout = useMemo(() => buildRowLayout(seed, count), [seed, count])

  const unitGeom = useMemo(() => new THREE.PlaneGeometry(1, 1), [])

  const { matLong, matOne } = useMemo(() => {
    const base = {
      transparent: false,
      alphaTest: 0.2,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
      roughness: 0.9,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -0.25,
      polygonOffsetUnits: -0.25,
    }
    const ml = new THREE.MeshStandardMaterial({ ...base, map: longMap })
    const mo = new THREE.MeshStandardMaterial({ ...base, map: oneMap })
    return { matLong: ml, matOne: mo }
  }, [longMap, oneMap])

  const houseEntries = useMemo(() => {
    return layout
      .filter((l) => l.kind === "long" || l.kind === "one")
      .map((item) => {
        const map = item.kind === "long" ? longMap : oneMap
        const iw = map.image?.width ?? 256
        const ih = map.image?.height ?? 512
        const aspect = iw / Math.max(ih, 1)
        const height = HOUSE_WORLD_HEIGHT * item.scale
        const width = height * aspect
        return {
          id: item.id,
          kind: item.kind,
          x: item.x,
          z: item.z,
          width,
          height,
          halfH: height / 2,
        }
      })
  }, [layout, longMap, oneMap])

  const { treeHeight, treeMinY } = useMemo(() => {
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    return {
      treeHeight: Math.max(size.y, 0.02),
      treeMinY: box.min.y,
    }
  }, [scene])

  const treeClones = useMemo(() => {
    return layout.filter((l) => l.kind === "tree").map(() => {
      const clone = scene.clone(true)
      clone.traverse((o) => {
        if (o.isMesh && o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => { m.side = THREE.DoubleSide })
        }
      })
      return clone
    })
  }, [layout, scene])

  const treeItems = useMemo(
    () => layout.filter((l) => l.kind === "tree"),
    [layout]
  )

  return (
    <group>
      <BatchedDistantHouses
        entries={houseEntries}
        matLong={matLong}
        matOne={matOne}
        unitGeom={unitGeom}
      />

      {treeItems.map((item, i) => {
        const obj = treeClones[i]
        const s = (HOUSE_WORLD_HEIGHT * item.scale) / treeHeight
        const posY = WATER_SURFACE_Y - treeMinY * s
        return (
          <primitive
            key={item.id}
            object={obj}
            position={[item.x, posY, item.z]}
            scale={s}
            rotation={[0, item.rotY, 0]}
            castShadow
            receiveShadow
          />
        )
      })}
    </group>
  )
}

useGLTF.preload("/coconut_tree.glb")
