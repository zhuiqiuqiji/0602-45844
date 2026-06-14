<script setup lang="ts">
import { useGameStore } from '@/stores/game'

const store = useGameStore()
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
        class="px-4 py-2 rounded-lg"
        style="background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);"
      >
        <div class="text-xs" style="color: rgba(236,240,241,0.6);">最高</div>
        <div class="text-lg font-calligraphy" style="color: #e8c84a;">
          {{ store.highScore }}
        </div>
      </div>
    </div>
  </div>
</template>
