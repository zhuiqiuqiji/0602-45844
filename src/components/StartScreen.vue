<script setup lang="ts">
defineProps<{
  onStart: () => void
}>()
</script>

<template>
  <div
    class="absolute inset-0 z-20 flex flex-col items-center justify-center fade-in"
    style="background: rgba(26,10,46,0.85); backdrop-filter: blur(4px);"
  >
    <div class="mb-2" style="color: #27ae60; font-size: 3rem; opacity: 0.5;">
      ╱╲
    </div>
    <h1
      class="font-calligraphy mb-4"
      style="font-size: 5rem; color: #f1c40f; text-shadow: 0 0 30px rgba(241,196,15,0.3), 0 4px 8px rgba(0,0,0,0.5);"
    >
      竹竿舞
    </h1>
    <p class="mb-8 text-lg" style="color: rgba(236,240,241,0.6);">
      跟随节奏，在竹竿间翩翩起舞
    </p>

    <button
      @click="onStart"
      class="px-10 py-4 rounded-xl text-xl font-bold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
      style="background: linear-gradient(135deg, #c4a24e, #e8c84a); color: #1a0a2e; box-shadow: 0 4px 15px rgba(196,162,78,0.4), inset 0 1px 0 rgba(255,255,255,0.2); border: 2px solid #8b6914;"
    >
      开始游戏
    </button>

    <div class="mt-8 flex flex-col items-center gap-2" style="color: rgba(236,240,241,0.5);">
      <div class="flex items-center gap-3">
        <kbd
          class="px-3 py-1 rounded text-sm"
          style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);"
        >
          空格键
        </kbd>
        <span class="text-sm">或</span>
        <kbd
          class="px-3 py-1 rounded text-sm"
          style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);"
        >
          点击屏幕
        </kbd>
      </div>
      <span class="text-sm">跳跃到下一对竹竿间</span>
    </div>

    <div class="mt-6 text-xs" style="color: rgba(236,240,241,0.3);">
      在竹竿打开时跳跃，闭合时离开，节奏逐渐加快！
    </div>
  </div>
</template>
