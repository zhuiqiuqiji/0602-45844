import { defineStore } from 'pinia'
import {
  INITIAL_BPM,
  MAX_BPM,
  BPM_INCREMENT,
  SCORE_PER_INCREMENT,
  POLE_PAIRS,
  type GameState,
} from '@/game/constants'

export const useGameStore = defineStore('game', {
  state: () => ({
    gameState: 'idle' as GameState,
    score: 0,
    highScore: parseInt(localStorage.getItem('bamboo-dance-highscore') || '0', 10),
    bpm: INITIAL_BPM,
    combo: 0,
    lastBeatTime: 0,
    beatCount: 0,
  }),

  actions: {
    startGame() {
      this.gameState = 'playing'
      this.score = 0
      this.bpm = INITIAL_BPM
      this.combo = 0
      this.beatCount = 0
      this.lastBeatTime = performance.now()
    },

    addScore() {
      this.score++
      this.combo++
      if (this.score > 0 && this.score % SCORE_PER_INCREMENT === 0) {
        this.bpm = Math.min(this.bpm + BPM_INCREMENT, MAX_BPM)
      }
      if (this.score > this.highScore) {
        this.highScore = this.score
        localStorage.setItem('bamboo-dance-highscore', String(this.highScore))
      }
    },

    gameOver() {
      this.gameState = 'gameover'
      this.combo = 0
    },

    resetGame() {
      this.gameState = 'idle'
      this.score = 0
      this.bpm = INITIAL_BPM
      this.combo = 0
      this.beatCount = 0
    },

    onBeat(now: number) {
      this.beatCount++
      this.lastBeatTime = now
    },
  },

  getters: {
    beatInterval(): number {
      return 60000 / this.bpm
    },
  },
})
