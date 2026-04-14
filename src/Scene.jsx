import { Canvas, useThree } from "@react-three/fiber"
import { Stars, Sky, Environment } from "@react-three/drei"
import { Suspense, useMemo, useState, useCallback, useRef, useLayoutEffect } from "react"
import CoconutTree from "./components/CoconutTreeModel"
import BoatController from "./components/BoatController"
import Sea from "./components/Sea"
import DistantShoreDecor from "./components/DistantShoreDecor"
import NearShoreGround from "./components/NearShoreGround"
import FallingCoconut from "./components/FallingCoconut"
import {
  WATER_SURFACE_Y,
  SEA_HIT_Y,
  SHORE_LINE_Z,
  VOCAB_TREE_MODEL_SCALE,
  VOCAB_CROWN_LOCAL,
  VOCAB_TREE_BASE_LIFT,
  MOVE_STEP,
} from "./sceneConstants"

function getCrownWorldPos(treePos) {
  return [
    treePos[0] + VOCAB_CROWN_LOCAL[0] * VOCAB_TREE_MODEL_SCALE,
    treePos[1] + VOCAB_CROWN_LOCAL[1] * VOCAB_TREE_MODEL_SCALE,
    treePos[2] + VOCAB_CROWN_LOCAL[2] * VOCAB_TREE_MODEL_SCALE,
  ]
}

const SHADOW_CAM = {
  far: 100,
  left: -40,
  right: 40,
  top: 30,
  bottom: -30,
}

/** Keeps renderer clear color in sync when toggling day / night */
function SyncClearColor({ hex }) {
  const gl = useThree((s) => s.gl)
  useLayoutEffect(() => {
    gl.setClearColor(hex)
  }, [gl, hex])
  return null
}

// Sky uses full vector; directional light uses same direction (scaled) for stable shadows
const SUN_VEC = [340, 165, 260]
const SUN_LIGHT_POS = SUN_VEC.map((v) => v * 0.22)

function SceneAtmosphere({ isDay }) {
  if (isDay) {
    return (
      <>
        <SyncClearColor hex="#a8d8f5" />
        <Sky
          distance={450000}
          sunPosition={SUN_VEC}
          mieCoefficient={0.004}
          mieDirectionalG={0.85}
          rayleigh={0.85}
          turbidity={4.2}
        />
        <fog attach="fog" args={["#b8dff5", 55, 260]} />

        <ambientLight intensity={0.42} color="#f5f0e6" />
        {/* Tropical sun — same direction as Sky */}
        <directionalLight
          position={SUN_LIGHT_POS}
          castShadow
          intensity={2.85}
          color="#fff4dd"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={SHADOW_CAM.far}
          shadow-camera-left={SHADOW_CAM.left}
          shadow-camera-right={SHADOW_CAM.right}
          shadow-camera-top={SHADOW_CAM.top}
          shadow-camera-bottom={SHADOW_CAM.bottom}
        />
        {/* Soft sky bounce */}
        <directionalLight position={[-120, 40, -80]} intensity={0.38} color="#c8e8ff" />
      </>
    )
  }

  return (
    <>
      <SyncClearColor hex="#0a1428" />
      <color attach="background" args={["#0c1834"]} />
      <fog attach="fog" args={["#182442", 32, 150]} />

      {/* Bright night base — readable scene */}
      <ambientLight intensity={0.42} color="#5a6fa8" />
      {/* Crisp moonlight */}
      <directionalLight
        position={[-16, 26, -24]}
        castShadow
        intensity={1.65}
        color="#dceaff"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={SHADOW_CAM.far}
        shadow-camera-left={SHADOW_CAM.left}
        shadow-camera-right={SHADOW_CAM.right}
        shadow-camera-top={SHADOW_CAM.top}
        shadow-camera-bottom={SHADOW_CAM.bottom}
      />
      <directionalLight position={[14, 12, 8]} intensity={0.28} color="#8090c8" />
      <pointLight position={[0, -0.5, 10]} intensity={1.15} color="#2a5590" distance={70} decay={2} />
      <pointLight position={[0, 7, 28]} intensity={0.55} color="#7088d8" distance={90} decay={2} />

      <Stars radius={200} depth={70} count={6500} factor={4.2} saturation={0.22} fade speed={0.35} />
    </>
  )
}

/** IBL for water / wet materials — reflects HDR sky tones (no second background) */
function SceneEnvironmentMap({ isDay }) {
  return (
    <Environment
      files="/sea_background.hdr"
      background={false}
      environmentIntensity={isDay ? 0.78 : 0.24}
    />
  )
}

// Pick a random English word from vocab pool that differs from the correct one
function pickDistractor(vocab, allVocabularies) {
  const pool = allVocabularies.filter(
    (v) => v.$id !== vocab.$id && v.english && v.english !== vocab.english
  )
  if (pool.length === 0) return "—"
  return pool[Math.floor(Math.random() * pool.length)].english
}

// ── Coconut-slash animation widget ──────────────────────────
const DROP_ANGLES = [0, 60, 120, 180, 240, 300]

function CoconutSlash() {
  return (
    <div style={{
      position: "fixed",
      bottom: "14%",
      right: "6%",
      width: 80,
      height: 80,
      zIndex: 15,
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        position: "relative",
        fontSize: "2.2rem",
        lineHeight: 1,
        animation: "coconutSlash 0.65s ease-out forwards",
      }}>
        🥥
        <div style={{
          position: "absolute",
          top: "50%",
          left: "-15%",
          width: "130%",
          height: 3,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 2,
          transformOrigin: "left center",
          transform: "rotate(-32deg) translateY(-50%)",
          animation: "slashLine 0.65s ease-out forwards",
        }} />
      </div>
      {DROP_ANGLES.map((angle, i) => (
        <div key={i} style={{ position: "absolute", transform: `rotate(${angle}deg)` }}>
          <div style={{
            width: 6, height: 6,
            borderRadius: "50%",
            background: `hsl(${168 + i * 6}, 72%, 62%)`,
            animation: `waterDropFly 0.62s ${i * 0.025}s ease-out forwards`,
            opacity: 0,
          }} />
        </div>
      ))}
    </div>
  )
}

// ── Choice button ────────────────────────────────────────────
function ChoiceButton({ label, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        padding: "14px 12px",
        fontSize: "1rem",
        fontWeight: "bold",
        borderRadius: "10px",
        border: "2px solid rgba(255,255,255,0.25)",
        background: hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)",
        color: "#fff",
        cursor: "pointer",
        transition: "background 0.15s",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </button>
  )
}

export default function Scene({ vocabularies = [] }) {
  const [stepsAvailable, setStepsAvailable] = useState(0)
  const [arrived, setArrived] = useState(false)
  const [arrivalDismissed, setArrivalDismissed] = useState(false)

  // Full ordered list of collected vocab (oldest first); never shrinks
  const [boatCoconuts, setBoatCoconuts] = useState([])
  const [collectedIds, setCollectedIds] = useState(() => new Set())

  // { vocab, crownPos, choices:[{english,isCorrect}] }
  const [activeChallenge, setActiveChallenge] = useState(null)
  const [fallingCoconut, setFallingCoconut]   = useState(null)
  const [feedback, setFeedback]               = useState(null) // 'correct'|'wrong'

  const [slashKey, setSlashKey]         = useState(0)
  const [slashVisible, setSlashVisible] = useState(false)
  const slashTimer = useRef(null)

  const [drinkKey, setDrinkKey]         = useState(0)
  const [drinkVisible, setDrinkVisible] = useState(false)
  const drinkTimer = useRef(null)

  const [coconutPopKey, setCoconutPopKey] = useState(0)
  const [isDay, setIsDay] = useState(true)

  // Derived
  const coconutsOnBoat = Math.ceil(stepsAvailable / 2)
  const visibleCoconuts = coconutsOnBoat > 0
    ? boatCoconuts.slice(-coconutsOnBoat)
    : []

  const vocabChunks = useMemo(() => {
    const chunks = []
    for (let i = 0; i < vocabularies.length; i += 10) {
      chunks.push(vocabularies.slice(i, i + 10))
    }
    return chunks
  }, [vocabularies])

  // treeCount * 5 coconuts * 2 steps each * MOVE_STEP units per step
  const startZ = SHORE_LINE_Z + Math.max(vocabChunks.length, 1) * 5 * 2 * MOVE_STEP

  // ── Tree clicked → 2-choice quiz ─────────────────────────
  const handleTreeClick = useCallback((vocab, treePos) => {
    if (activeChallenge) return
    const crownPos = getCrownWorldPos(treePos)
    const distractorEnglish = pickDistractor(vocab, vocabularies)
    const correct    = { english: vocab.english || "?", isCorrect: true }
    const distractor = { english: distractorEnglish,    isCorrect: false }
    const choices = Math.random() < 0.5
      ? [correct, distractor]
      : [distractor, correct]
    setActiveChallenge({ vocab, crownPos, choices })
    setFeedback(null)
  }, [activeChallenge, vocabularies])

  // ── Player picks a choice ─────────────────────────────────
  const handleChoice = useCallback((isCorrect) => {
    if (!activeChallenge) return
    setFeedback(isCorrect ? "correct" : "wrong")
    const vocabSnapshot = activeChallenge.vocab
    const crownSnapshot = activeChallenge.crownPos
    setActiveChallenge(null)
    setTimeout(() => setFeedback(null), 2200)

    if (isCorrect) {
      setBoatCoconuts((prev) => [...prev, vocabSnapshot])
      setStepsAvailable((s) => s + 2)
      setCollectedIds((prev) => {
        const next = new Set(prev)
        next.add(vocabSnapshot.$id)
        // When every word across all trees has been collected, reset for a new cycle
        const totalIds = vocabularies.filter((v) => v.$id).length
        if (next.size >= totalIds) return new Set()
        return next
      })
      setCoconutPopKey((k) => k + 1)
    } else {
      setFallingCoconut({ startPos: crownSnapshot })
    }
  }, [activeChallenge, vocabularies])

  // ── Boat arrived at shore ─────────────────────────────────
  const handleArrived = useCallback(() => setArrived(true), [])

  const handleAnimationDone = useCallback(() => setFallingCoconut(null), [])

  // ── Step taken → slash + ripple ──────────────────────────
  const handleStepTaken = useCallback(() => {
    setStepsAvailable((s) => Math.max(0, s - 1))
    setSlashKey((k) => k + 1); setSlashVisible(true)
    clearTimeout(slashTimer.current)
    slashTimer.current = setTimeout(() => setSlashVisible(false), 750)
    setDrinkKey((k) => k + 1); setDrinkVisible(true)
    clearTimeout(drinkTimer.current)
    drinkTimer.current = setTimeout(() => setDrinkVisible(false), 750)
  }, [])

  return (
    <>
      <Canvas
        camera={{ position: [0, -0.1, startZ], fov: 110 }}
        dpr={[1, 1.5]}
        shadows
        style={{ width: "100vw", height: "100vh" }}
        gl={{ clearColor: "#a8d8f5", antialias: true }}
      >
        <SceneAtmosphere isDay={isDay} />

        <Sea position={[0, WATER_SURFACE_Y, 0]} />

        <Suspense fallback={null}>
          <SceneEnvironmentMap isDay={isDay} />
          <NearShoreGround />
          <DistantShoreDecor />

          {vocabChunks.map((chunk, index) => {
            // Distribute trees along the journey: one tree every 10 steps, alternating banks
            const treeZ = startZ - (index + 1) * 10 * MOVE_STEP
            const treeX = index % 2 === 0 ? -7 : 7
            return (
              <CoconutTree
                key={index}
                vocabularies={chunk}
                coconutCount={chunk.length}
                position={[treeX, WATER_SURFACE_Y + VOCAB_TREE_BASE_LIFT, treeZ]}
                onTreeClick={handleTreeClick}
                collectedIds={collectedIds}
              />
            )
          })}

          <BoatController
            stepsAvailable={stepsAvailable}
            onStepTaken={handleStepTaken}
            visibleCoconuts={visibleCoconuts}
            startZ={startZ}
            onArrived={handleArrived}
          />

          {fallingCoconut && (
            <FallingCoconut
              key={fallingCoconut.startPos.join(",")}
              startPos={fallingCoconut.startPos}
              onAnimationDone={handleAnimationDone}
            />
          )}
        </Suspense>
      </Canvas>

      {/* ── Slash animation ── */}
      {slashVisible && <CoconutSlash key={slashKey} />}

      {/* ── Screen ripple ── */}
      {drinkVisible && (
        <div key={drinkKey} style={{
          position: "fixed", inset: 0,
          background:
            "radial-gradient(circle at 50% 55%, " +
            "rgba(100,210,175,0.45) 0%, rgba(50,170,140,0.18) 42%, transparent 70%)",
          zIndex: 5, pointerEvents: "none",
          animation: "coconutDrink 0.75s ease-out forwards",
        }} />
      )}

      {/* ── 2-choice quiz overlay ── */}
      {activeChallenge && !feedback && (
        <div style={{
          position: "fixed",
          bottom: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(8,30,12,0.88)",
          color: "#fff",
          padding: "24px 28px",
          borderRadius: "16px",
          textAlign: "center",
          zIndex: 20,
          minWidth: "340px",
          maxWidth: "480px",
          boxShadow: "0 6px 32px rgba(0,0,0,0.6)",
        }}>
          {/* Thai word */}
          <p style={{ fontSize: "2rem", margin: "0 0 4px", color: "#ffe066", fontWeight: "bold" }}>
            {activeChallenge.vocab?.thai}
          </p>
          {/* Romanization */}
          {activeChallenge.vocab?.romanization && (
            <p style={{ fontSize: "0.85rem", margin: "0 0 16px", opacity: 0.55 }}>
              {activeChallenge.vocab.romanization}
            </p>
          )}
          <p style={{ fontSize: "0.78rem", margin: "0 0 14px", opacity: 0.6 }}>
            Choose the correct English translation:
          </p>
          {/* Two choices */}
          <div style={{ display: "flex", gap: 12 }}>
            {activeChallenge.choices.map(({ english, isCorrect }, i) => (
              <ChoiceButton
                key={i}
                label={english}
                onClick={() => handleChoice(isCorrect)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Feedback banner ── */}
      {feedback && (
        <div style={{
          position: "fixed",
          bottom: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          background: feedback === "correct"
            ? "rgba(46,125,50,0.92)"
            : "rgba(198,40,40,0.92)",
          color: "#fff",
          padding: "16px 36px",
          borderRadius: "12px",
          textAlign: "center",
          zIndex: 20,
          fontSize: "1.1rem",
          fontWeight: "bold",
          boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
        }}>
          {feedback === "correct"
            ? "🥥 Correct! Coconut on board · +2 steps"
            : "💧 Wrong! The coconut fell into the sea"}
        </div>
      )}

      {/* ── Day / night toggle ── */}
      <button
        type="button"
        onClick={() => setIsDay((d) => !d)}
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 12,
          padding: "10px 16px",
          borderRadius: "12px",
          border: "2px solid rgba(255,255,255,0.28)",
          background: isDay ? "rgba(255,200,80,0.35)" : "rgba(30,50,120,0.55)",
          color: "#fff",
          fontSize: "0.95rem",
          fontWeight: 700,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 18px rgba(0,0,0,0.25)",
        }}
        aria-pressed={isDay}
        title={isDay ? "Switch to night" : "Switch to day"}
      >
        {isDay ? "☀️ Day" : "🌙 Night"}
      </button>

      {/* ── HUD ── */}
      <div style={{
        position: "fixed", top: 16, right: 16,
        background: isDay ? "rgba(255,255,255,0.22)" : "rgba(5,10,40,0.70)",
        color: isDay ? "#1a2a50" : "#a0c4ff",
        padding: "10px 18px", borderRadius: "10px",
        fontSize: "1rem", lineHeight: 1.8,
        zIndex: 10, pointerEvents: "none", userSelect: "none",
        border: isDay ? "1px solid rgba(255,255,255,0.45)" : "none",
      }}>
        <div>
          <span
            key={coconutPopKey}
            style={{
              display: "inline-block",
              animation: coconutPopKey > 0 ? "coconutPop 0.45s ease-out" : "none",
            }}
          >🥥</span>
          {" "}{coconutsOnBoat}
          <span style={{ fontSize: "0.72rem", opacity: 0.55, marginLeft: 6 }}>
            ({boatCoconuts.length} total)
          </span>
        </div>
        <div>👣 {stepsAvailable} steps</div>
      </div>

      {/* ── Shore arrival greeting ── */}
      {arrived && !arrivalDismissed && (
        <div
          onKeyDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
            zIndex: 30,
            animation: "arrivalFadeIn 0.5s ease-out forwards",
          }}
        >
          <div style={{
            background: "rgba(8, 60, 30, 0.92)",
            border: "2px solid rgba(255,220,80,0.45)",
            borderRadius: "24px",
            padding: "48px 64px",
            textAlign: "center",
            boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
            position: "relative",
          }}>
            <div style={{ fontSize: "3.6rem", lineHeight: 1.25, color: "#ffe066", fontWeight: "bold", letterSpacing: "0.03em" }}>
              สวัสดีค่ะ
            </div>
            <div style={{ fontSize: "2rem", color: "#c8f0c0", marginTop: 12, fontWeight: 600 }}>
              ยินดีต้อนรับค่ะ
            </div>
            <button
              onClick={() => setArrivalDismissed(true)}
              style={{
                marginTop: 32,
                padding: "12px 36px",
                fontSize: "1rem",
                fontWeight: 700,
                borderRadius: "12px",
                border: "2px solid rgba(255,220,80,0.6)",
                background: "rgba(255,220,80,0.18)",
                color: "#ffe066",
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              ขอบคุณค่ะ
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom hint ── */}
      <div style={{
        position: "fixed", bottom: 16, left: "50%",
        transform: "translateX(-50%)",
        background: isDay ? "rgba(255,255,255,0.28)" : "rgba(5,10,40,0.65)",
        color: isDay ? "rgba(30,50,90,0.88)" : "rgba(160,196,255,0.75)",
        padding: "6px 18px", borderRadius: "20px",
        fontSize: "0.78rem", zIndex: 10,
        pointerEvents: "none", userSelect: "none", whiteSpace: "nowrap",
      }}>
        {stepsAvailable > 0
          ? "Arrow keys to move · Drag to look · Click trees to learn"
          : "Click a coconut tree to earn steps"}
      </div>
    </>
  )
}
