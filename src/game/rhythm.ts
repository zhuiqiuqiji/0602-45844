import {
  type RhythmMode,
  type LevelConfig,
  type BeatStep,
  type CustomPattern,
  LEVELS,
} from './constants'

export class RhythmEngine {
  private rhythmMode: RhythmMode = 'slow'
  private baseBpm = 80
  private maxBpm = 160
  private variablePattern: number[] = []
  private variableIndex = 0
  private customPattern: CustomPattern | null = null
  private customStepIndex = 0
  private levelConfig: LevelConfig | null = null

  setLevel(level: LevelConfig) {
    this.levelConfig = level
    this.rhythmMode = level.rhythmMode
    this.baseBpm = level.initialBpm
    this.maxBpm = level.maxBpm
    this.variablePattern = level.variablePattern
    this.variableIndex = 0
  }

  setCustomPattern(pattern: CustomPattern) {
    this.customPattern = pattern
    this.rhythmMode = 'custom'
    this.customStepIndex = 0
  }

  reset() {
    this.variableIndex = 0
    this.customStepIndex = 0
  }

  getBeatInterval(currentBpm: number): number {
    return 60000 / currentBpm
  }

  getNextBeatInterval(currentBpm: number, beatCount: number): number {
    switch (this.rhythmMode) {
      case 'slow':
        return 60000 / currentBpm

      case 'fast':
        return 60000 / currentBpm

      case 'variable':
        return this.getVariableInterval(currentBpm)

      case 'custom':
        return this.getCustomInterval(currentBpm)

      default:
        return 60000 / currentBpm
    }
  }

  private getVariableInterval(currentBpm: number): number {
    if (this.variablePattern.length === 0) return 60000 / currentBpm

    const divisor = this.variablePattern[this.variableIndex % this.variablePattern.length]
    this.variableIndex++

    const effectiveBpm = currentBpm * (4 / divisor)
    return 60000 / effectiveBpm
  }

  private getCustomInterval(currentBpm: number): number {
    if (!this.customPattern) return 60000 / currentBpm
    return 60000 / this.customPattern.bpm
  }

  getVariableBeatLabel(): string {
    if (this.variablePattern.length === 0) return ''
    const divisor = this.variablePattern[Math.max(0, (this.variableIndex - 1)) % this.variablePattern.length]
    const labels: Record<number, string> = { 1: '♩', 2: '♪♪', 4: '𝅘𝅥𝅮' }
    return labels[divisor] || ''
  }

  getCurrentPoleAction(beatCount: number, totalPoles: number): { action: 'open' | 'close'; poleIndices: number[] } | null {
    if (this.rhythmMode === 'custom' && this.customPattern) {
      const step = this.customPattern.steps[this.customStepIndex % this.customPattern.steps.length]
      this.customStepIndex++
      return step ? { action: step.action, poleIndices: step.poleIndices } : null
    }

    if (this.levelConfig && this.levelConfig.polePattern.length > 0) {
      const pattern = this.levelConfig.polePattern
      const step = pattern.find((p) => p.beatIndex === beatCount % (pattern.length || 1))
      if (step) {
        return { action: step.action, poleIndices: step.poleIndices || Array.from({ length: totalPoles }, (_, i) => i) }
      }
    }

    return null
  }

  shouldToggleAll(beatCount: number, totalPoles: number): boolean {
    if (this.rhythmMode === 'custom' && this.customPattern) return false
    if (this.levelConfig && this.levelConfig.polePattern.length > 0) return false
    return true
  }
}

export const rhythmEngine = new RhythmEngine()
