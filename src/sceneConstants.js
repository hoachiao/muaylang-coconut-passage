/** Shared waterline — boat, sea, shoreline props, vocab trees */
export const WATER_SURFACE_Y = -2.35
/** Boat movement per key press */
export const MOVE_STEP = 1.5
/** Coconuts splash slightly above nominal plane (visible hit) */
export const SEA_HIT_Y = WATER_SURFACE_Y + 0.08
/** Vocab coconut trees sit on this Z band (parallel to shore) */
export const SHORE_LINE_Z = 6.4
export const TREE_START_X = -8
export const TREE_SPACING_X = 3.15

/** Vocab coconut tree scale — keep in sync with Scene getCrownWorldPos */
export const VOCAB_TREE_MODEL_SCALE = 0.86
export const VOCAB_CROWN_LOCAL = [1.8, 8.0, 0.0]
/** Raise trunk/root above nominal waterline so more roots read above the sea */
export const VOCAB_TREE_BASE_LIFT = 0.28

/** Distant billboards — slightly behind nominal row reduces water depth fighting */
export const DISTANT_ROW_Z = -19.35
export const DISTANT_ROW_START_X = -52
export const DISTANT_SLOT_SPACING = 3.95
