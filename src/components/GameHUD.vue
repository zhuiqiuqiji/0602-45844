<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useMultiplayer } from '@/game/multiplayer'

const store = useGameStore()
const multiplayer = useMultiplayer()

const isMultiplayer = computed(() => multiplayer.mode.value !== 'offline')
const remotePlayers = computed(() => multiplayer.remotePlayers.value)
</script>

<template>
  <div class="absolute top-4 left-4 z-10 pointer-events-none">
    <div
      v-if="store.gameState === 'playing'"
      class="flex flex-col gap-2 fade-in"
    >
      <div
        class="px-4 py-2 rounded-lg"
        style="background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);"
      >
        <div class="text-xs" style="color: rgba(236,240,241,0.6);">得分</div>
        <div class="text-3xl font-bold font-calligraphy" style="color: #f1c40f;">
          {{ store.score }}
        </div>
      </div>
      <div
        class="px-3 py-1.5 rounded-lg"
        style="background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);"
      >
        <div class="text-xs" style="color: rgba(236,240,241,0.6);">连击</div>
        <div class="text-lg font-calligraphy" style="color: #2ecc71;">
          {{ store.combo }}x
        </div>
      </div>
      <div
        class="px-3 py-1.5 rounded-lg"
        style="background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);"
      >
        <div class="text-xs" style="color: rgba(236,240,241,0.6);">最高</div>
        <div class="text-lg font-calligraphy" style="color: #e8c84a;">
          {{ store.highScore }}
        </div>
      </div>
      <div
        v-if="store.lastTimingGrade"
        class="px-3 py-1 rounded-lg text-center text-sm font-bold"
        :style="{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: { perfect: '#f1c40f', great: '#2ecc71', good: '#3498db', miss: '#e74c3c' }[store.lastTimingGrade] }"
      >
        {{ { perfect: '完美', great: '太棒了', good: '不错', miss: '失误' }[store.lastTimingGrade] }}
      </div>
    </div>
  </div>

  <div v-if="store.competitionMode && store.gameState === 'playing'" class="absolute top-4 right-4 z-10 pointer-events-none">
    <div
      class="px-4 py-2 rounded-lg"
      style="background: rgba(52,152,219,0.3); backdrop-filter: blur(8px); border: 1px solid rgba(52,152,219,0.5);"
    >
      <div class="text-xs" style="color: rgba(236,240,241,0.6);">对手得分</div>
      <div class="text-2xl font-bold font-calligraphy" style="color: #3498db;">
        {{ store.ghostScore }}
      </div>
    </div>
  </div>

  <div v-if="isMultiplayer && store.gameState === 'playing'" class="absolute top-4 right-4 z-10 pointer-events-none">
    <div class="flex flex-col gap-2">
      <div
        v-for="player in remotePlayers"
        :key="player.id"
        class="px-4 py-2 rounded-lg"
        :style="{
          background: 'rgba(52,152,219,0.25)',
          backdropFilter: 'blur(8px)',
          border: player.isGameOver ? '1px solid rgba(231,76,60,0.5)' : '1px solid rgba(52,152,219,0.5)',
          opacity: player.isGameOver ? 0.6 : 1,
        }"
      >
        <div class="text-xs" style="color: rgba(236,240,241,0.6);">
          {{ player.name }}
          <span v-if="player.isGameOver" style="color: #e74c3c;">(已出局)</span>
        </div>
        <div class="text-2xl font-bold font-calligraphy" style="color: #3498db;">
          {{ player.score }}
        </div>
        <div class="text-xs" style="color: rgba(46,204,113,0.8);">
          {{ player.combo }}x 连击
        </div>
      </div>
    </div>
  </div>
</template>
