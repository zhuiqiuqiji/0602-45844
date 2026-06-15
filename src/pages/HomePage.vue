<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGameLoop } from '@/composables/useGameLoop'
import GameHUD from '@/components/GameHUD.vue'
import StartScreen from '@/components/StartScreen.vue'
import GameOverScreen from '@/components/GameOverScreen.vue'

const store = useGameStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { startGame, restartGame } = useGameLoop(canvasRef)

function handleStart() {
  startGame()
}

function handleRestart() {
  store.stopCompetition()
  restartGame()
}
</script>

<template>
  <div class="relative w-full h-full overflow-hidden" style="background: #1a0a2e;">
    <canvas
      ref="canvasRef"
      class="block w-full h-full"
    />

    <GameHUD />

    <StartScreen
      v-if="store.gameState === 'idle'"
      :on-start="handleStart"
    />

    <GameOverScreen
      v-if="store.gameState === 'gameover'"
      :on-restart="handleRestart"
    />
  </div>
</template>
