import { defineStore } from 'pinia'
import {
  INITIAL_BPM,
  MAX_BPM,
  BPM_INCREMENT,
  SCORE_PER_INCREMENT,
  LEVELS,
  GRADE_POINTS,
  GRADE_COLORS,
  DIFFICULTY_CONFIG,
  RHYTHM_LABELS,
  type GameState,
  type TimingGrade,
  type TimingResult,
  type LevelConfig,
  type RhythmMode,
  type DifficultyLevel,
  type ReplayFrame,
  type CompetitionGhost,
  type CustomPattern,
  type BeatStep,
} from '@/game/constants'

export const useGameStore = defineStore('game', {
  state: () => ({
    gameState: 'idle' as GameState,
    score: 0,
    highScore: parseInt(localStorage.getItem('bamboo-dance-highscore') || '0', 10),
    bpm: INITIAL_BPM,
    combo: 0,
    maxCombo: 0,
    lastBeatTime: 0,
    beatCount: 0,
    currentLevel: LEVELS[0],
    selectedLevelId: 1,
    rhythmMode: 'slow' as RhythmMode,
    difficulty: 'normal' as DifficultyLevel,
    timingWindows: DIFFICULTY_CONFIG.normal.timingWindows,
    lastTimingGrade: null as TimingGrade | null,
    totalPerfects: 0,
    totalGreats: 0,
    totalGoods: 0,
    totalMisses: 0,
    useAI: false,
    customPattern: null as CustomPattern | null,
    savedPatterns: JSON.parse(localStorage.getItem('bamboo-dance-patterns') || '[]') as CustomPattern[],
    replay: [] as ReplayFrame[],
    gameStartTime: 0,
    competitionMode: false,
    ghost: null as CompetitionGhost | null,
    ghostScore: 0,
    soundEnabled: true,
  }),

  actions: {
    startGame() {
      this.gameState = 'playing'
      this.score = 0
      this.bpm = this.currentLevel.initialBpm
      this.combo = 0
      this.maxCombo = 0
      this.beatCount = 0
      this.lastBeatTime = performance.now()
      this.lastTimingGrade = null
      this.totalPerfects = 0
      this.totalGreats = 0
      this.totalGoods = 0
      this.totalMisses = 0
      this.replay = []
      this.gameStartTime = performance.now()
      this.ghostScore = 0
    },

    addScore(grade: TimingGrade) {
      const points = GRADE_POINTS[grade]
      this.score += points
      this.combo++
      if (this.combo > this.maxCombo) this.maxCombo = this.combo

      switch (grade) {
        case 'perfect': this.totalPerfects++; break
        case 'great': this.totalGreats++; break
        case 'good': this.totalGoods++; break
      }

      if (this.score > 0 && this.score % SCORE_PER_INCREMENT === 0) {
        this.bpm = Math.min(this.bpm + BPM_INCREMENT, this.currentLevel.maxBpm)
      }

      if (this.score > this.highScore) {
        this.highScore = this.score
        localStorage.setItem('bamboo-dance-highscore', String(this.highScore))
      }

      this.lastTimingGrade = grade
    },

    recordMiss() {
      this.combo = 0
      this.totalMisses++
      this.lastTimingGrade = 'miss'
    },

    gameOver() {
      this.gameState = 'gameover'
      this.combo = 0
    },

    resetGame() {
      this.gameState = 'idle'
      this.score = 0
      this.bpm = this.currentLevel.initialBpm
      this.combo = 0
      this.beatCount = 0
    },

    onBeat(now: number) {
      this.beatCount++
      this.lastBeatTime = now
    },

    selectLevel(levelId: number) {
      const level = LEVELS.find((l) => l.id === levelId)
      if (level) {
        this.currentLevel = level
        this.selectedLevelId = levelId
        this.bpm = level.initialBpm
        this.rhythmMode = level.rhythmMode
        this.difficulty = level.difficulty
        this.timingWindows = DIFFICULTY_CONFIG[level.difficulty].timingWindows
      }
    },

    setCustomPattern(pattern: CustomPattern) {
      this.customPattern = pattern
      this.rhythmMode = 'custom'
    },

    savePattern(pattern: CustomPattern) {
      const existing = this.savedPatterns.findIndex((p) => p.name === pattern.name)
      if (existing >= 0) {
        this.savedPatterns[existing] = pattern
      } else {
        this.savedPatterns.push(pattern)
      }
      localStorage.setItem('bamboo-dance-patterns', JSON.stringify(this.savedPatterns))
    },

    deletePattern(name: string) {
      this.savedPatterns = this.savedPatterns.filter((p) => p.name !== name)
      localStorage.setItem('bamboo-dance-patterns', JSON.stringify(this.savedPatterns))
    },

    recordReplayFrame(action: 'jump') {
      this.replay.push({
        time: performance.now() - this.gameStartTime,
        action,
        score: this.score,
      })
    },

    startCompetition(ghost: CompetitionGhost) {
      this.ghost = ghost
      this.competitionMode = true
      this.ghostScore = 0
    },

    stopCompetition() {
      this.competitionMode = false
      this.ghost = null
    },

    updateGhostScore(ghostScore: number) {
      this.ghostScore = ghostScore
    },

    generateGhost(): CompetitionGhost {
      return {
        name: '我',
        frames: [...this.replay],
        finalScore: this.score,
      }
    },

    setAIEnabled(enabled: boolean) {
      this.useAI = enabled
    },

    setSoundEnabled(enabled: boolean) {
      this.soundEnabled = enabled
    },
  },

  getters: {
    beatInterval(): number {
      return 60000 / this.bpm
    },

    levelName(): string {
      return this.currentLevel.name
    },

    accuracy(): number {
      const total = this.totalPerfects + this.totalGreats + this.totalGoods + this.totalMisses
      if (total === 0) return 100
      return Math.round(((this.totalPerfects * 3 + this.totalGreats * 2 + this.totalGoods) / (total * 3)) * 100)
    },

    gradeDistribution(): string {
      return `P${this.totalPerfects} G${this.totalGreats} g${this.totalGoods} M${this.totalMisses}`
    },
  },
})
