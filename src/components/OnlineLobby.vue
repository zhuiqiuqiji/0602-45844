<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useMultiplayer } from '@/game/multiplayer'
import { LEVELS, DIFFICULTY_CONFIG, RHYTHM_LABELS } from '@/game/constants'

const store = useGameStore()
const multiplayer = useMultiplayer()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'start'): void
}>()

const playerName = ref(localStorage.getItem('bamboo-dance-player-name') || '玩家')
const serverUrl = ref(import.meta.env.VITE_WS_URL || 'ws://localhost:8080')
const roomIdInput = ref('')
const roomNameInput = ref('我的房间')
const selectedLevelId = ref(1)
const chatInput = ref('')
const showCreateMode = ref<'menu' | 'create' | 'join' | 'room'>('menu')
const isConnecting = ref(false)
const errorMsg = ref('')

const connectionStatus = computed(() => multiplayer.connectionStatus.value)
const mode = computed(() => multiplayer.mode.value)
const currentRoom = computed(() => multiplayer.currentRoom.value)
const remotePlayers = computed(() => multiplayer.remotePlayers.value)
const chatMessages = computed(() => multiplayer.chatMessages.value)
const localPlayerId = computed(() => multiplayer.localPlayerId.value)

const isHost = computed(() => {
  return currentRoom.value?.hostId === localPlayerId.value
})

const allReady = computed(() => {
  if (!currentRoom.value) return false
  return currentRoom.value.players.every((p) => p.isReady)
})

const localPlayer = computed(() => {
  return currentRoom.value?.players.find((p) => p.id === localPlayerId.value)
})

function savePlayerName() {
  localStorage.setItem('bamboo-dance-player-name', playerName.value)
  multiplayer.setPlayerName(playerName.value)
}

async function connectServer() {
  if (isConnecting.value) return
  isConnecting.value = true
  errorMsg.value = ''
  savePlayerName()

  try {
    await multiplayer.connect(serverUrl.value)
    showCreateMode.value = 'menu'
  } catch (e) {
    errorMsg.value = '连接服务器失败，请检查地址是否正确'
  } finally {
    isConnecting.value = false
  }
}

async function createRoom() {
  if (!roomNameInput.value.trim()) {
    errorMsg.value = '请输入房间名称'
    return
  }

  try {
    await multiplayer.createRoom(roomNameInput.value.trim(), selectedLevelId.value)
    showCreateMode.value = 'room'
    multiplayer.sendReady(true)
  } catch (e) {
    errorMsg.value = '创建房间失败'
  }
}

async function joinRoom() {
  if (!roomIdInput.value.trim()) {
    errorMsg.value = '请输入房间号'
    return
  }

  try {
    await multiplayer.joinRoom(roomIdInput.value.trim().toUpperCase())
    showCreateMode.value = 'room'
    multiplayer.sendReady(true)
  } catch (e) {
    errorMsg.value = '加入房间失败，请检查房间号'
  }
}

function leaveRoom() {
  multiplayer.leaveRoom()
  showCreateMode.value = 'menu'
}

function toggleReady() {
  if (localPlayer.value) {
    multiplayer.sendReady(!localPlayer.value.isReady)
  }
}

function startOnlineGame() {
  if (!isHost.value) return
  const level = LEVELS.find((l) => l.id === currentRoom.value?.levelId)
  if (level) {
    store.selectLevel(level.id)
  }
  multiplayer.startGame()
  emit('start')
}

function startLocalAI() {
  savePlayerName()
  multiplayer.startLocalAI(store.selectedLevelId)
  showCreateMode.value = 'room'
}

function startLocalAIGame() {
  emit('start')
}

function sendChat() {
  if (!chatInput.value.trim()) return
  multiplayer.sendChat(chatInput.value.trim())
  chatInput.value = ''
}

function goBack() {
  if (showCreateMode.value === 'room') {
    leaveRoom()
  } else {
    showCreateMode.value = 'menu'
  }
  errorMsg.value = ''
}

function closeLobby() {
  if (mode.value === 'local_ai') {
    multiplayer.stopLocalAI()
  }
  emit('close')
}

onMounted(() => {
  savePlayerName()
})

onUnmounted(() => {
  // Don't disconnect on unmount in case game is starting
})
</script>

<template>
  <div
    class="absolute inset-0 z-30 flex flex-col items-center justify-center fade-in"
    style="background: rgba(26,10,46,0.95); backdrop-filter: blur(8px);"
  >
    <template v-if="showCreateMode === 'menu'">
      <h2 class="font-calligraphy text-4xl mb-8" style="color: #f1c40f;">
        在线对战
      </h2>

      <div class="flex flex-col gap-4 w-80">
        <div class="px-4 py-3 rounded-xl" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(196,162,78,0.2);">
          <div class="text-xs mb-2" style="color: rgba(236,240,241,0.5);">玩家昵称</div>
          <input
            v-model="playerName"
            type="text"
            maxlength="12"
            class="w-full px-3 py-2 rounded-lg text-sm"
            style="background: rgba(0,0,0,0.3); color: #ecf0f1; border: 1px solid rgba(255,255,255,0.2);"
            placeholder="输入你的昵称"
          />
        </div>

        <div class="px-4 py-3 rounded-xl" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(52,152,219,0.3);">
          <div class="text-xs mb-2" style="color: rgba(52,152,219,0.7);">服务器地址</div>
          <input
            v-model="serverUrl"
            type="text"
            class="w-full px-3 py-2 rounded-lg text-sm mb-3"
            style="background: rgba(0,0,0,0.3); color: #ecf0f1; border: 1px solid rgba(255,255,255,0.2);"
            placeholder="ws://..."
          />
          <button
            @click="connectServer"
            :disabled="isConnecting"
            class="w-full px-4 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
            :style="{
              background: isConnecting
                ? 'rgba(52,152,219,0.2)'
                : 'linear-gradient(135deg, rgba(52,152,219,0.5), rgba(41,128,185,0.3))',
              color: isConnecting ? 'rgba(52,152,219,0.5)' : '#3498db',
              border: '1px solid rgba(52,152,219,0.5)',
            }"
          >
            {{ isConnecting ? '连接中...' : connectionStatus === 'connected' ? '已连接 ✓' : '连接服务器' }}
          </button>
        </div>

        <div class="relative py-2">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t" style="border-color: rgba(255,255,255,0.1);"></div>
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="px-3" style="background: rgba(26,10,46,0.95); color: rgba(236,240,241,0.4);">或者</span>
          </div>
        </div>

        <button
          @click="startLocalAI"
          class="px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
          style="background: linear-gradient(135deg, rgba(46,204,113,0.4), rgba(39,174,96,0.2)); color: #2ecc71; border: 1px solid rgba(46,204,113,0.5);"
        >
          🤖 本地 AI 对战
        </button>

        <div v-if="errorMsg" class="text-sm text-center px-3 py-2 rounded-lg" style="color: #e74c3c; background: rgba(231,76,60,0.1);">
          {{ errorMsg }}
        </div>
      </div>

      <button
        @click="closeLobby"
        class="mt-6 px-6 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:scale-105"
        style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.8); border: 1px solid rgba(255,255,255,0.2);"
      >
        返回
      </button>
    </template>

    <template v-else-if="showCreateMode === 'create'">
      <h2 class="font-calligraphy text-3xl mb-6" style="color: #f1c40f;">创建房间</h2>

      <div class="flex flex-col gap-4 w-80">
        <div class="px-4 py-3 rounded-xl" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(196,162,78,0.2);">
          <div class="text-xs mb-2" style="color: rgba(236,240,241,0.5);">房间名称</div>
          <input
            v-model="roomNameInput"
            type="text"
            maxlength="20"
            class="w-full px-3 py-2 rounded-lg text-sm"
            style="background: rgba(0,0,0,0.3); color: #ecf0f1; border: 1px solid rgba(255,255,255,0.2);"
            placeholder="给房间起个名字"
          />
        </div>

        <div class="px-4 py-3 rounded-xl" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(196,162,78,0.2);">
          <div class="text-xs mb-3" style="color: rgba(236,240,241,0.5);">选择关卡</div>
          <div class="flex flex-col gap-2 max-h-48 overflow-y-auto">
            <button
              v-for="level in LEVELS"
              :key="level.id"
              @click="selectedLevelId = level.id"
              class="px-3 py-2 rounded-lg text-left text-sm cursor-pointer transition-all duration-150"
              :style="{
                background: selectedLevelId === level.id ? 'rgba(196,162,78,0.2)' : 'rgba(255,255,255,0.05)',
                border: selectedLevelId === level.id ? '1px solid #c4a24e' : '1px solid rgba(255,255,255,0.1)',
              }"
            >
              <div class="font-calligraphy" style="color: #f1c40f;">Lv.{{ level.id }} {{ level.name }}</div>
              <div class="text-xs" style="color: rgba(236,240,241,0.4);">
                {{ DIFFICULTY_CONFIG[level.difficulty].label }} | {{ RHYTHM_LABELS[level.rhythmMode] }}
              </div>
            </button>
          </div>
        </div>

        <button
          @click="createRoom"
          class="px-6 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
          style="background: linear-gradient(135deg, #c4a24e, #e8c84a); color: #1a0a2e; border: 2px solid #8b6914;"
        >
          创建房间
        </button>

        <div v-if="errorMsg" class="text-sm text-center px-3 py-2 rounded-lg" style="color: #e74c3c; background: rgba(231,76,60,0.1);">
          {{ errorMsg }}
        </div>
      </div>

      <button
        @click="goBack"
        class="mt-6 px-6 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:scale-105"
        style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.8); border: 1px solid rgba(255,255,255,0.2);"
      >
        返回
      </button>
    </template>

    <template v-else-if="showCreateMode === 'join'">
      <h2 class="font-calligraphy text-3xl mb-6" style="color: #f1c40f;">加入房间</h2>

      <div class="flex flex-col gap-4 w-80">
        <div class="px-4 py-3 rounded-xl" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(196,162,78,0.2);">
          <div class="text-xs mb-2" style="color: rgba(236,240,241,0.5);">房间号</div>
          <input
            v-model="roomIdInput"
            type="text"
            maxlength="8"
            class="w-full px-3 py-2 rounded-lg text-sm text-center font-mono tracking-widest"
            style="background: rgba(0,0,0,0.3); color: #ecf0f1; border: 1px solid rgba(255,255,255,0.2);"
            placeholder="输入 6 位房间号"
          />
        </div>

        <button
          @click="joinRoom"
          class="px-6 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
          style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: 2px solid #1a5276;"
        >
          加入房间
        </button>

        <div v-if="errorMsg" class="text-sm text-center px-3 py-2 rounded-lg" style="color: #e74c3c; background: rgba(231,76,60,0.1);">
          {{ errorMsg }}
        </div>
      </div>

      <button
        @click="goBack"
        class="mt-6 px-6 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:scale-105"
        style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.8); border: 1px solid rgba(255,255,255,0.2);"
      >
        返回
      </button>
    </template>

    <template v-else-if="showCreateMode === 'room'">
      <h2 class="font-calligraphy text-3xl mb-2" style="color: #f1c40f;">
        {{ currentRoom?.name || '房间' }}
      </h2>
      <div class="text-sm mb-6" style="color: rgba(236,240,241,0.5);">
        房间号: <span class="font-mono font-bold" style="color: #3498db;">{{ currentRoom?.id }}</span>
      </div>

      <div class="w-80 mb-4">
        <div class="text-xs mb-2" style="color: rgba(236,240,241,0.5);">玩家列表</div>
        <div class="flex flex-col gap-2">
          <div
            v-for="player in currentRoom?.players"
            :key="player.id"
            class="flex items-center justify-between px-4 py-3 rounded-xl"
            :style="{
              background: player.id === localPlayerId
                ? 'rgba(196,162,78,0.15)'
                : 'rgba(0,0,0,0.3)',
              border: player.id === localPlayerId
                ? '1px solid rgba(196,162,78,0.4)'
                : '1px solid rgba(255,255,255,0.1)',
            }"
          >
            <div class="flex items-center gap-2">
              <span v-if="player.id === currentRoom?.hostId" style="color: #f1c40f;">👑</span>
              <span style="color: #ecf0f1;">{{ player.name }}</span>
              <span v-if="player.id === localPlayerId" class="text-xs" style="color: rgba(236,240,241,0.5);">(你)</span>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="text-xs px-2 py-0.5 rounded"
                :style="{
                  background: player.isReady ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.1)',
                  color: player.isReady ? '#2ecc71' : 'rgba(236,240,241,0.5)',
                }"
              >
                {{ player.isReady ? '已准备' : '未准备' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="w-80 mb-4 px-4 py-3 rounded-xl" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
        <div class="text-xs mb-2" style="color: rgba(236,240,241,0.5);">聊天</div>
        <div class="h-24 overflow-y-auto mb-2 text-xs" style="color: rgba(236,240,241,0.7);">
          <div v-if="chatMessages.length === 0" style="color: rgba(236,240,241,0.3);">
            暂无消息...
          </div>
          <div v-for="(msg, idx) in chatMessages" :key="idx" class="mb-1">
            <span style="color: #f1c40f;">{{ msg.playerName }}</span>
            <span style="color: rgba(236,240,241,0.7);">: {{ msg.message }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <input
            v-model="chatInput"
            type="text"
            class="flex-1 px-2 py-1.5 rounded text-xs"
            style="background: rgba(0,0,0,0.3); color: #ecf0f1; border: 1px solid rgba(255,255,255,0.2);"
            placeholder="输入消息..."
            @keyup.enter="sendChat"
          />
          <button
            @click="sendChat"
            class="px-3 py-1.5 rounded text-xs cursor-pointer"
            style="background: rgba(52,152,219,0.3); color: #3498db; border: 1px solid rgba(52,152,219,0.5);"
          >
            发送
          </button>
        </div>
      </div>

      <div class="flex gap-3">
        <template v-if="mode === 'local_ai'">
          <button
            @click="startLocalAIGame"
            class="px-8 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
            style="background: linear-gradient(135deg, #c4a24e, #e8c84a); color: #1a0a2e; box-shadow: 0 4px 15px rgba(196,162,78,0.4); border: 2px solid #8b6914;"
          >
            开始对战
          </button>
        </template>

        <template v-else>
          <button
            v-if="isHost"
            @click="startOnlineGame"
            :disabled="!allReady"
            class="px-8 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
            :style="{
              background: allReady
                ? 'linear-gradient(135deg, #c4a24e, #e8c84a)'
                : 'rgba(255,255,255,0.1)',
              color: allReady ? '#1a0a2e' : 'rgba(236,240,241,0.5)',
              boxShadow: allReady ? '0 4px 15px rgba(196,162,78,0.4)' : 'none',
              border: allReady ? '2px solid #8b6914' : '1px solid rgba(255,255,255,0.2)',
            }"
          >
            开始游戏
          </button>
          <button
            v-else
            @click="toggleReady"
            class="px-6 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 hover:scale-105"
            :style="{
              background: localPlayer?.isReady
                ? 'rgba(231,76,60,0.3)'
                : 'rgba(46,204,113,0.3)',
              color: localPlayer?.isReady
                ? '#e74c3c'
                : '#2ecc71',
              border: localPlayer?.isReady
                ? '1px solid rgba(231,76,60,0.5)'
                : '1px solid rgba(46,204,113,0.5)',
            }"
          >
            {{ localPlayer?.isReady ? '取消准备' : '准备' }}
          </button>
        </template>

        <button
          @click="goBack"
          class="px-5 py-3 rounded-xl text-sm cursor-pointer transition-all duration-200 hover:scale-105"
          style="background: rgba(255,255,255,0.1); color: rgba(236,240,241,0.8); border: 1px solid rgba(255,255,255,0.2);"
        >
          离开
        </button>
      </div>
    </template>
  </div>
</template>
