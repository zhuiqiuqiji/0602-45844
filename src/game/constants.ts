export const INITIAL_BPM = 80
export const MAX_BPM = 220
export const BPM_INCREMENT = 5
export const SCORE_PER_INCREMENT = 10

export const POLE_PAIRS = 4
export const JUMP_DURATION = 320
export const GROUND_OFFSET = 0.25
export const POLE_THICKNESS = 14
export const POLE_OPEN_GAP = 70
export const POLE_CLOSE_GAP = 4
export const POLE_LENGTH_RATIO = 0.14
export const POLE_SPACING_RATIO = 0.17
export const POLE_START_X_RATIO = 0.15
export const UPPER_POLE_BASE_Y_RATIO = 0.55
export const LOWER_POLE_BASE_Y_RATIO = 0.63

export const DANCER_WIDTH = 30
export const DANCER_HEIGHT = 50

export const TIMING_PERFECT = 50
export const TIMING_GREAT = 120
export const TIMING_GOOD = 200

export type TimingGrade = 'perfect' | 'great' | 'good' | 'miss'

export type GameState = 'idle' | 'playing' | 'gameover' | 'editor' | 'competition'
export type PoleState = 'open' | 'closing' | 'close' | 'opening'
export type DancerState = 'standing' | 'jumping' | 'caught'
export type RhythmMode = 'slow' | 'fast' | 'variable' | 'custom'
export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'expert'

export interface TimingResult {
  grade: TimingGrade
  points: number
  text: string
  color: string
  time: number
}

export interface LevelConfig {
  id: number
  name: string
  polePairs: number
  initialBpm: number
  maxBpm: number
  rhythmMode: RhythmMode
  difficulty: DifficultyLevel
  variablePattern: number[]
  polePattern: PolePatternItem[]
}

export interface PolePatternItem {
  beatIndex: number
  action: 'open' | 'close'
  poleIndices?: number[]
}

export interface BeatStep {
  beatIndex: number
  action: 'open' | 'close'
  poleIndices: number[]
}

export interface CustomPattern {
  name: string
  bpm: number
  steps: BeatStep[]
}

export interface ReplayFrame {
  time: number
  action: 'jump'
  score: number
}

export interface CompetitionGhost {
  name: string
  frames: ReplayFrame[]
  finalScore: number
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '初学入门',
    polePairs: 3,
    initialBpm: 60,
    maxBpm: 120,
    rhythmMode: 'slow',
    difficulty: 'easy',
    variablePattern: [],
    polePattern: [],
  },
  {
    id: 2,
    name: '渐入佳境',
    polePairs: 4,
    initialBpm: 80,
    maxBpm: 160,
    rhythmMode: 'slow',
    difficulty: 'normal',
    variablePattern: [],
    polePattern: [],
  },
  {
    id: 3,
    name: '快板挑战',
    polePairs: 4,
    initialBpm: 100,
    maxBpm: 180,
    rhythmMode: 'fast',
    difficulty: 'normal',
    variablePattern: [],
    polePattern: [],
  },
  {
    id: 4,
    name: '变速旋风',
    polePairs: 5,
    initialBpm: 80,
    maxBpm: 200,
    rhythmMode: 'variable',
    difficulty: 'hard',
    variablePattern: [4, 4, 2, 2, 4, 4, 2, 2, 1, 1, 1, 1],
    polePattern: [],
  },
  {
    id: 5,
    name: '大师之路',
    polePairs: 5,
    initialBpm: 120,
    maxBpm: 220,
    rhythmMode: 'variable',
    difficulty: 'expert',
    variablePattern: [4, 2, 2, 1, 1, 4, 2, 1, 1, 1, 2, 1],
    polePattern: [],
  },
]

export const DIFFICULTY_CONFIG: Record<DifficultyLevel, { timingWindows: number[]; label: string }> = {
  easy: { timingWindows: [80, 160, 260], label: '简单' },
  normal: { timingWindows: [50, 120, 200], label: '普通' },
  hard: { timingWindows: [35, 80, 140], label: '困难' },
  expert: { timingWindows: [25, 50, 100], label: '大师' },
}

export const RHYTHM_LABELS: Record<RhythmMode, string> = {
  slow: '慢板',
  fast: '快板',
  variable: '变速',
  custom: '自定义',
}

export const GRADE_COLORS: Record<TimingGrade, string> = {
  perfect: '#f1c40f',
  great: '#2ecc71',
  good: '#3498db',
  miss: '#e74c3c',
}

export const GRADE_POINTS: Record<TimingGrade, number> = {
  perfect: 3,
  great: 2,
  good: 1,
  miss: 0,
}

export const COLORS = {
  sky: ['#1a0a2e', '#2d1b4e', '#4a2c6e'],
  ground: '#3d2b1f',
  groundLight: '#5c4033',
  bamboo: '#c4a24e',
  bambooDark: '#8b6914',
  bambooLight: '#e8c84a',
  bambooJoint: '#9b7a20',
  dancerBody: '#c0392b',
  dancerSkin: '#f5cba7',
  dancerAccent: '#e74c3c',
  operatorSkin: '#f5cba7',
  operatorClothes1: '#2ecc71',
  operatorClothes2: '#3498db',
  mountainFar: '#2a1a3a',
  mountainNear: '#3d2b4a',
  leafGreen: '#27ae60',
  leafLight: '#2ecc71',
  beatGlow: '#f39c12',
  textGold: '#f1c40f',
  textWhite: '#ecf0f1',
  shadow: 'rgba(0,0,0,0.3)',
  dustColor: 'rgba(194,162,78,0.6)',
  ghostDancer: 'rgba(52,152,219,0.5)',
}

export interface PolePair {
  x: number
  upperY: number
  lowerY: number
  targetUpperY: number
  targetLowerY: number
  state: PoleState
  openProgress: number
}

export interface Dancer {
  x: number
  y: number
  baseY: number
  targetX: number
  targetY: number
  startX: number
  startY: number
  currentGap: number
  state: DancerState
  jumpProgress: number
  jumpStartGap: number
}

export interface Operator {
  x: number
  y: number
  armAngle: number
  targetArmAngle: number
  side: 'left' | 'right'
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'dust' | 'leaf' | 'spark' | 'grade'
  text?: string
}

export interface BeatFlash {
  x: number
  y: number
  radius: number
  alpha: number
}

export interface TimingPopup {
  x: number
  y: number
  text: string
  color: string
  life: number
  maxLife: number
}

export interface GhostDancer {
  x: number
  y: number
  state: DancerState
}
