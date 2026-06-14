<script setup lang="ts">
import { useGameStore } from '@/stores/game'

defineProps<{
  onRestart: () => void
}>()

const store = useGameStore()
</script>

<template>
  <div
    class="absolute inset-0 z-20 flex flex-col items-center justify-center fade-in"
    style="background: rgba(26,10,46,0.9); backdrop-filter: blur(6px);"
  >
    <div
      class="font-calligraphy mb-4"
      style="font-size: 3.5rem; color: #e74c3c; text-shadow: 0 0 20px rgba(231,76,60,0.4);"
    >
      被夹住了！
    </div>

    <div
      class="px-8 py-6 rounded-2xl mb-6"
      style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); border: 1px solid rgba(196,162,78,0.3);"
    >
      <div class="text-center mb-4">
        <div class="text-sm mb-1" style="color: rgba(236,240,241,0.5);">本次得分</div>
        <div
          class="font-calligraphy"
          style="font-size: 4rem; color: #f1c40f; text-shadow: 0 0 15px rgba(241,196,15,0.3);"
        >
          {{ store.score }}
        </div>
      </div>

      <div class="text-center">
        <div class="text-sm mb-1" style="color: rgba(236,240,241,0.5);">最高纪录</div>
        <div class="font-calligraphy text-2xl" style="color: #e8c84a;">
          {{ store.highScore }}
        </div>
      </div>
    </div>

    <div
      v-if="store.score === store.highScore && store.score > 0"
      class="mb-4 px-4 py-2 rounded-lg"
      style="background: rgba(241,196,15,0.2); color: #f1c40f; border: 1px solid rgba(241,196,15,0.3);"
    >
      🎉 新纪录！
    </div>

    <button
      @click="onRestart"
      class="px-10 py-4 rounded-xl text-xl font-bold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
      style="background: linear-gradient(135deg, #c4a24e, #e8c84a); color: #1a0a2e; box-shadow: 0 4px 15px rgba(196,162,78,0.4), inset 0 1px 0 rgba(255,255,255,0.2); border: 2px solid #8b6914;"
    >
      再来一次
    </button>
  </div>
</template>
