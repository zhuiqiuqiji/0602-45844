<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { GRADE_COLORS, RHYTHM_LABELS, DIFFICULTY_CONFIG } from '@/game/constants'

const store = useGameStore()
const showEditor = ref(false)
const editorBeats = ref(8)
const editorBpm = ref(80)
const editorName = ref('自定义节奏')
const editorSteps = ref<Array<{ beatIndex: number; action: 'open' | 'close'; poleIndices: number[] }>>([])

defineProps<{
  onRestart: () => void
}>()

function initEditor() {
  editorSteps.value = []
  for (let i = 0; i < editorBeats.value; i++) {
    editorSteps.value.push({
      beatIndex: i,
      action: i % 2 === 0 ? 'open' : 'close',
      poleIndices: [],
    })
  }
}

function savePattern() {
  const steps = editorSteps.value.map((s) => ({
    beatIndex: s.beatIndex,
    action: s.action,
    poleIndices: s.poleIndices.length > 0 ? s.poleIndices : [0, 1, 2, 3],
  }))

  store.savePattern({
    name: editorName.value,
    bpm: editorBpm.value,
    steps,
  })
  showEditor.value = false
}

function toggleStepAction(index: number) {
  const step = editorSteps.value[index]
  if (step) {
    step.action = step.action === 'open' ? 'close' : 'open'
  }
}

function startCompetition() {
  const ghost = store.generateGhost()
  ghost.name = '之前的你'
  store.startCompetition(ghost)
}
</script>

<template>
  <div
    class="absolute inset-0 z-20 flex flex-col items-center justify-center fade-in"
    style="background: rgba(26,10,46,0.9); backdrop-filter: blur(6px);"
  >
    <template v-if="!showEditor">
      <div
        class="font-calligraphy mb-4"
        style="font-size: 3.5rem; color: #e74c3c; text-shadow: 0 0 20px rgba(231,76,60,0.4);"
      >
        被夹住了！
      </div>

      <div
        class="px-8 py-6 rounded-2xl mb-4"
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

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="text-center">
            <div class="text-sm mb-1" style="color: rgba(236,240,241,0.5);">最高连击</div>
            <div class="font-calligraphy text-xl" style="color: #2ecc71;">{{ store.maxCombo }}x</div>
          </div>
          <div class="text-center">
            <div class="text-sm mb-1" style="color: rgba(236,240,241,0.5);">准确率</div>
            <div class="font-calligraphy text-xl" style="color: #3498db;">{{ store.accuracy }}%</div>
          </div>
        </div>

        <div class="flex justify-center gap-4 text-sm mb-3">
          <span :style="{ color: GRADE_COLORS.perfect }">完美 {{ store.totalPerfects }}</span>
          <span :style="{ color: GRADE_COLORS.great }">太棒 {{ store.totalGreats }}</span>
          <span :style="{ color: GRADE_COLORS.good }">不错 {{ store.totalGoods }}</span>
          <span :style="{ color: GRADE_COLORS.miss }">失误 {{ store.totalMisses }}</span>
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
        新纪录！
      </div>

      <div class="flex gap-3 mb-4">
        <button
          @click="onRestart"
          class="px-8 py-3.5 rounded-xl text-lg font-bold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
          style="background: linear-gradient(135deg, #c4a24e, #e8c84a); color: #1a0a2e; box-shadow: 0 4px 15px rgba(196,162,78,0.4); border: 2px solid #8b6914;"
        >
          再来一次
        </button>
        <button
          @click="startCompetition"
          class="px-5 py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 hover:scale-105"
          style="background: rgba(52,152,219,0.3); color: #3498db; border: 1px solid rgba(52,152,219,0.5);"
        >
          挑战自己
        </button>
      </div>

      <div class="flex gap-3">
        <button
          @click="showEditor = true; initEditor()"
          class="px-4 py-2 rounded-lg text-xs cursor-pointer transition-all duration-200 hover:scale-105"
          style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.7); border: 1px solid rgba(255,255,255,0.15);"
        >
          舞步编辑器
        </button>
      </div>
    </template>

    <template v-else>
      <h2 class="font-calligraphy text-3xl mb-4" style="color: #f1c40f;">舞步编辑器</h2>
      <p class="text-sm mb-4" style="color: rgba(236,240,241,0.5);">点击节拍切换开/合，编排你的节奏</p>

      <div class="flex gap-3 mb-4">
        <div class="px-3 py-2 rounded-lg" style="background: rgba(255,255,255,0.05);">
          <label class="text-xs" style="color: rgba(236,240,241,0.5);">节拍数</label>
          <input
            v-model.number="editorBeats"
            type="number"
            min="4"
            max="32"
            class="block w-16 px-2 py-1 rounded text-center text-sm"
            style="background: rgba(0,0,0,0.3); color: #ecf0f1; border: 1px solid rgba(255,255,255,0.2);"
            @change="initEditor"
          />
        </div>
        <div class="px-3 py-2 rounded-lg" style="background: rgba(255,255,255,0.05);">
          <label class="text-xs" style="color: rgba(236,240,241,0.5);">BPM</label>
          <input
            v-model.number="editorBpm"
            type="number"
            min="40"
            max="240"
            class="block w-20 px-2 py-1 rounded text-center text-sm"
            style="background: rgba(0,0,0,0.3); color: #ecf0f1; border: 1px solid rgba(255,255,255,0.2);"
          />
        </div>
        <div class="px-3 py-2 rounded-lg" style="background: rgba(255,255,255,0.05);">
          <label class="text-xs" style="color: rgba(236,240,241,0.5);">名称</label>
          <input
            v-model="editorName"
            type="text"
            class="block w-28 px-2 py-1 rounded text-sm"
            style="background: rgba(0,0,0,0.3); color: #ecf0f1; border: 1px solid rgba(255,255,255,0.2);"
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mb-4 max-w-lg justify-center">
        <button
          v-for="(step, idx) in editorSteps"
          :key="idx"
          @click="toggleStepAction(idx)"
          class="w-12 h-12 rounded-lg text-xs font-bold cursor-pointer transition-all duration-150 hover:scale-110"
          :style="{
            background: step.action === 'open' ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)',
            color: step.action === 'open' ? '#2ecc71' : '#e74c3c',
            border: step.action === 'open' ? '1px solid rgba(46,204,113,0.5)' : '1px solid rgba(231,76,60,0.5)',
          }"
        >
          {{ idx + 1 }}<br>{{ step.action === 'open' ? '开' : '合' }}
        </button>
      </div>

      <div
        v-if="store.savedPatterns.length > 0"
        class="mb-4 w-80"
      >
        <div class="text-xs mb-2" style="color: rgba(236,240,241,0.5);">已保存的节奏</div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="pattern in store.savedPatterns"
            :key="pattern.name"
            class="flex items-center gap-1 px-2 py-1 rounded text-xs"
            style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);"
          >
            <span style="color: rgba(236,240,241,0.7);">{{ pattern.name }}</span>
            <button
              @click="store.deletePattern(pattern.name)"
              class="cursor-pointer"
              style="color: rgba(231,76,60,0.6);"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button
          @click="savePattern"
          class="px-5 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:scale-105"
          style="background: rgba(46,204,113,0.3); color: #2ecc71; border: 1px solid rgba(46,204,113,0.5);"
        >
          保存节奏
        </button>
        <button
          @click="showEditor = false"
          class="px-5 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:scale-105"
          style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.8); border: 1px solid rgba(255,255,255,0.2);"
        >
          返回
        </button>
      </div>
    </template>
  </div>
</template>
