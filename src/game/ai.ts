import { type RhythmMode, type PolePatternItem, GRADE_POINTS, type TimingGrade } from './constants'

export interface AIState {
  baseBpm: number
  currentBpm: number
  maxBpm: number
  aggressiveness: number
  playerSkillScore: number
  recentGrades: TimingGrade[]
  beatCount: number
}

export class AIEngine {
  private state: AIState = {
    baseBpm: 80,
    currentBpm: 80,
    maxBpm: 200,
    aggressiveness: 0.3,
    playerSkillScore: 0.5,
    recentGrades: [],
    beatCount: 0,
  }

  init(baseBpm: number, maxBpm: number, difficulty: number = 0.3) {
    this.state = {
      baseBpm,
      currentBpm: baseBpm,
      maxBpm,
      aggressiveness: difficulty,
      playerSkillScore: 0.5,
      recentGrades: [],
      beatCount: 0,
    }
  }

  onPlayerGrade(grade: TimingGrade) {
    this.state.recentGrades.push(grade)
    if (this.state.recentGrades.length > 10) {
      this.state.recentGrades.shift()
    }

    const avgPoints = this.state.recentGrades.reduce((sum, g) => sum + GRADE_POINTS[g], 0) / this.state.recentGrades.length
    this.state.playerSkillScore = avgPoints / 3

    this.adaptDifficulty()
  }

  private adaptDifficulty() {
    const skill = this.state.playerSkillScore

    if (skill > 0.8) {
      this.state.aggressiveness = Math.min(1, this.state.aggressiveness + 0.05)
      this.state.currentBpm = Math.min(this.state.maxBpm, this.state.currentBpm + 2)
    } else if (skill < 0.4) {
      this.state.aggressiveness = Math.max(0.1, this.state.aggressiveness - 0.03)
      this.state.currentBpm = Math.max(this.state.baseBpm, this.state.currentBpm - 1)
    }
  }

  getCurrentBpm(): number {
    return this.state.currentBpm
  }

  getAggressiveness(): number {
    return this.state.aggressiveness
  }

  generatePoleAction(totalPoles: number, beatCount: number): { action: 'open' | 'close'; poleIndices: number[] } {
    this.state.beatCount = beatCount

    const isClose = beatCount % 2 === 1

    if (this.state.aggressiveness > 0.6 && Math.random() < this.state.aggressiveness * 0.3) {
      const skipPole = Math.floor(Math.random() * totalPoles)
      const indices = Array.from({ length: totalPoles }, (_, i) => i).filter((i) => i !== skipPole)
      return {
        action: isClose ? 'close' : 'open',
        poleIndices: indices,
      }
    }

    if (this.state.aggressiveness > 0.4 && Math.random() < this.state.aggressiveness * 0.15) {
      const delayedPole = Math.floor(Math.random() * totalPoles)
      return {
        action: isClose ? 'close' : 'open',
        poleIndices: [delayedPole],
      }
    }

    return {
      action: isClose ? 'close' : 'open',
      poleIndices: Array.from({ length: totalPoles }, (_, i) => i),
    }
  }

  getVariablePattern(): number[] {
    const agg = this.state.aggressiveness
    if (agg < 0.3) return [4, 4, 4, 4]
    if (agg < 0.5) return [4, 4, 2, 2]
    if (agg < 0.7) return [4, 2, 2, 1, 1]
    return [2, 2, 1, 1, 4, 1, 1, 2]
  }

  getRhythmMode(): RhythmMode {
    if (this.state.aggressiveness < 0.3) return 'slow'
    if (this.state.aggressiveness < 0.6) return 'fast'
    return 'variable'
  }

  onBeat() {
    if (this.state.beatCount > 0 && this.state.beatCount % 20 === 0) {
      if (this.state.playerSkillScore > 0.6) {
        this.state.currentBpm = Math.min(this.state.maxBpm, this.state.currentBpm + 3)
      }
    }
  }
}

export const aiEngine = new AIEngine()
