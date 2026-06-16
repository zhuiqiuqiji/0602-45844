<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { LEVELS, RHYTHM_LABELS, DIFFICULTY_CONFIG, type LevelConfig } from '@/game/constants'
import OnlineLobby from '@/components/OnlineLobby.vue'

const store = useGameStore()
const showLevels = ref(false)
const showSettings = ref(false)
const showOnline = ref(false)

const props = defineProps<{
  onStart: () => void
}>()

function selectLevel(level: LevelConfig) {
  store.selectLevel(level.id)
  showLevels.value = false
}

function toggleAI() {
  store.setAIEnabled(!store.useAI)
}

function toggleSound() {
  store.setSoundEnabled(!store.soundEnabled)
}

function handleOnlineStart() {
  showOnline.value = false
  props.onStart()
}
</script>

<template>
  <div
    class="absolute inset-0 z-20 flex flex-col items-center justify-center fade-in"
    style="background: rgba(26,10,46,0.85); backdrop-filter: blur(4px);"
  >
    <template v-if="!showLevels && !showSettings">
      <div class="mb-2" style="color: #27ae60; font-size: 3rem; opacity: 0.5;">
        ╱╲
      </div>
      <h1
        class="font-calligraphy mb-2"
        style="font-size: 5rem; color: #f1c40f; text-shadow: 0 0 30px rgba(241,196,15,0.3), 0 4px 8px rgba(0,0,0,0.5);"
      >
        竹竿舞
      </h1>
      <p class="mb-6 text-lg" style="color: rgba(236,240,241,0.6);">
        跟随节奏，在竹竿间翩翩起舞
      </p>

      <div
        class="mb-6 px-5 py-2.5 rounded-lg text-center"
        style="background: rgba(0,0,0,0.3); border: 1px solid rgba(196,162,78,0.3);"
      >
        <div class="text-xs mb-1" style="color: rgba(236,240,241,0.5);">当前关卡</div>
        <div class="font-calligraphy text-xl" style="color: #f1c40f;">
          Lv.{{ store.currentLevel.id }} {{ store.currentLevel.name }}
        </div>
        <div class="text-xs mt-1" style="color: rgba(236,240,241,0.4);">
          {{ RHYTHM_LABELS[store.currentLevel.rhythmMode] }} | {{ DIFFICULTY_CONFIG[store.currentLevel.difficulty].label }}
          | {{ store.currentLevel.polePairs }}对竹竿
        </div>
      </div>

      <div class="flex gap-3 mb-4">
        <button
          @click="onStart"
          class="px-10 py-4 rounded-xl text-xl font-bold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
          style="background: linear-gradient(135deg, #c4a24e, #e8c84a); color: #1a0a2e; box-shadow: 0 4px 15px rgba(196,162,78,0.4), inset 0 1px 0 rgba(255,255,255,0.2); border: 2px solid #8b6914;"
        >
          开始游戏
        </button>
      </div>

      <button
        @click="showOnline = true"
        class="mb-4 px-6 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all duration-200 hover:scale-105"
        style="background: linear-gradient(135deg, rgba(52,152,219,0.5), rgba(41,128,185,0.3)); color: #3498db; border: 1px solid rgba(52,152,219,0.5);"
      >
        🌐 在线对战
      </button>

      <div class="flex gap-3 mb-6">
        <button
          @click="showLevels = true"
          class="px-5 py-2.5 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:scale-105"
          style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.8); border: 1px solid rgba(255,255,255,0.2);"
        >
          选择关卡
        </button>
        <button
          @click="showSettings = true"
          class="px-5 py-2.5 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:scale-105"
          style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.8); border: 1px solid rgba(255,255,255,0.2);"
        >
          设置
        </button>
      </div>

      <div class="flex flex-col items-center gap-2" style="color: rgba(236,240,241,0.5);">
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
        <span class="text-sm">在节拍时跳跃，节奏越准分数越高！</span>
      </div>
    </template>

    <template v-else-if="showLevels">
      <h2 class="font-calligraphy text-3xl mb-6" style="color: #f1c40f;">选择关卡</h2>
      <div class="flex flex-col gap-3 w-80 max-h-96 overflow-y-auto pr-2">
        <button
          v-for="level in LEVELS"
          :key="level.id"
          @click="selectLevel(level)"
          class="px-5 py-3 rounded-xl text-left cursor-pointer transition-all duration-200 hover:scale-[1.02]"
          :style="{
            background: level.id === store.selectedLevelId
              ? 'linear-gradient(135deg, rgba(196,162,78,0.4), rgba(232,200,74,0.2))'
              : 'rgba(255,255,255,0.05)',
            border: level.id === store.selectedLevelId
              ? '2px solid #c4a24e'
              : '1px solid rgba(255,255,255,0.1)',
          }"
        >
          <div class="flex justify-between items-center">
            <span class="font-calligraphy text-lg" style="color: #f1c40f;">
              Lv.{{ level.id }} {{ level.name }}
            </span>
            <span class="text-xs px-2 py-0.5 rounded" style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.6);">
              {{ DIFFICULTY_CONFIG[level.difficulty].label }}
            </span>
          </div>
          <div class="text-xs mt-1" style="color: rgba(236,240,241,0.4);">
            {{ level.polePairs }}对竹竿 | {{ RHYTHM_LABELS[level.rhythmMode] }} | BPM {{ level.initialBpm }}-{{ level.maxBpm }}
          </div>
        </button>
      </div>
      <button
        @click="showLevels = false"
        class="mt-6 px-6 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:scale-105"
        style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.8); border: 1px solid rgba(255,255,255,0.2);"
      >
        返回
      </button>
    </template>

    <template v-else-if="showSettings">
      <h2 class="font-calligraphy text-3xl mb-6" style="color: #f1c40f;">设置</h2>
      <div class="flex flex-col gap-4 w-72">
        <div class="flex justify-between items-center px-4 py-3 rounded-lg" style="background: rgba(255,255,255,0.05);">
          <span style="color: rgba(236,240,241,0.8);">AI 操作竹竿</span>
          <button
            @click="toggleAI"
            class="px-4 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-200"
            :style="{
              background: store.useAI ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.1)',
              color: store.useAI ? '#2ecc71' : 'rgba(236,240,241,0.5)',
              border: store.useAI ? '1px solid rgba(46,204,113,0.5)' : '1px solid rgba(255,255,255,0.2)',
            }"
          >
            {{ store.useAI ? '开启' : '关闭' }}
          </button>
        </div>
        <div class="flex justify-between items-center px-4 py-3 rounded-lg" style="background: rgba(255,255,255,0.05);">
          <span style="color: rgba(236,240,241,0.8);">音效</span>
          <button
            @click="toggleSound"
            class="px-4 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-200"
            :style="{
              background: store.soundEnabled ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.1)',
              color: store.soundEnabled ? '#2ecc71' : 'rgba(236,240,241,0.5)',
              border: store.soundEnabled ? '1px solid rgba(46,204,113,0.5)' : '1px solid rgba(255,255,255,0.2)',
            }"
          >
            {{ store.soundEnabled ? '开启' : '关闭' }}
          </button>
        </div>
        <div class="px-4 py-3 rounded-lg" style="background: rgba(255,255,255,0.05);">
          <div class="mb-2" style="color: rgba(236,240,241,0.8);">节奏模式</div>
          <div class="text-xs" style="color: rgba(236,240,241,0.4);">
            {{ RHYTHM_LABELS[store.rhythmMode] }}
            <span v-if="store.useAI">（AI 自适应）</span>
          </div>
        </div>
      </div>
      <button
        @click="showSettings = false"
        class="mt-6 px-6 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:scale-105"
        style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.8); border: 1px solid rgba(255,255,255,0.2);"
      >
        返回
      </button>
    </template>

    <OnlineLobby
      v-if="showOnline"
      @close="showOnline = false"
      @start="handleOnlineStart"
    />
  </div>
</template>
