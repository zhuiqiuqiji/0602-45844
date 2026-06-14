export const INITIAL_BPM = 80
export const MAX_BPM = 200
export const BPM_INCREMENT = 5
export const SCORE_PER_INCREMENT = 10

export const POLE_PAIRS = 4
export const JUMP_DURATION = 350
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
}

export type GameState = 'idle' | 'playing' | 'gameover'
export type PoleState = 'open' | 'closing' | 'close' | 'opening'
export type DancerState = 'standing' | 'jumping' | 'caught'

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
  type: 'dust' | 'leaf' | 'spark'
}

export interface BeatFlash {
  x: number
  y: number
  radius: number
  alpha: number
}
