import { ref } from 'vue'
import type { TimingGrade, Dancer } from './constants'
import { aiEngine } from './ai'

export interface PlayerState {
  id: string
  name: string
  score: number
  combo: number
  isReady: boolean
  isGameOver: boolean
}

export interface RoomInfo {
  id: string
  name: string
  hostId: string
  players: PlayerState[]
  maxPlayers: number
  isPlaying: boolean
  levelId: number
}

export interface SyncMessage {
  type: 'sync' | 'jump' | 'start' | 'ready' | 'room_info' | 'join' | 'leave' | 'chat' | 'game_over'
  playerId?: string
  playerName?: string
  data?: any
  timestamp: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type MultiplayerMode = 'offline' | 'online' | 'local_ai'

const DEFAULT_SERVER_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

class MultiplayerEngine {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private heartbeatInterval: number | null = null

  public connectionStatus = ref<ConnectionStatus>('disconnected')
  public mode = ref<MultiplayerMode>('offline')
  public currentRoom = ref<RoomInfo | null>(null)
  public localPlayerId = ref<string>('')
  public localPlayerName = ref<string>('玩家')
  public errorMessage = ref<string>('')
  public remotePlayers = ref<PlayerState[]>([])
  public chatMessages = ref<{ playerName: string; message: string; time: number }[]>([])

  private onJumpCallback: ((playerId: string, grade: TimingGrade, timestamp: number) => void) | null = null
  private onGameStartCallback: (() => void) | null = null
  private onPlayerJoinCallback: ((player: PlayerState) => void) | null = null
  private onPlayerLeaveCallback: ((playerId: string) => void) | null = null
  private onSyncCallback: ((players: PlayerState[]) => void) | null = null
  private onGameOverCallback: ((playerId: string) => void) | null = null

  private aiBeatCounter = 0
  private aiJumpCooldown = 0

  constructor() {
    this.localPlayerId.value = this.generatePlayerId()
  }

  private generatePlayerId(): string {
    return 'player_' + Math.random().toString(36).substr(2, 9)
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substr(2, 6).toUpperCase()
  }

  setPlayerName(name: string) {
    this.localPlayerName.value = name
  }

  setOnJumpCallback(callback: (playerId: string, grade: TimingGrade, timestamp: number) => void) {
    this.onJumpCallback = callback
  }

  setOnGameStartCallback(callback: () => void) {
    this.onGameStartCallback = callback
  }

  setOnPlayerJoinCallback(callback: (player: PlayerState) => void) {
    this.onPlayerJoinCallback = callback
  }

  setOnPlayerLeaveCallback(callback: (playerId: string) => void) {
    this.onPlayerLeaveCallback = callback
  }

  setOnSyncCallback(callback: (players: PlayerState[]) => void) {
    this.onSyncCallback = callback
  }

  setOnGameOverCallback(callback: (playerId: string) => void) {
    this.onGameOverCallback = callback
  }

  connect(serverUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.connectionStatus.value = 'connecting'
      this.errorMessage.value = ''

      const url = serverUrl || DEFAULT_SERVER_URL

      try {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          this.connectionStatus.value = 'connected'
          this.reconnectAttempts = 0
          this.mode.value = 'online'
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: SyncMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.errorMessage.value = '连接服务器失败'
          this.connectionStatus.value = 'error'
          reject(error)
        }

        this.ws.onclose = () => {
          this.connectionStatus.value = 'disconnected'
          this.stopHeartbeat()
          this.tryReconnect()
        }
      } catch (e) {
        this.connectionStatus.value = 'error'
        this.errorMessage.value = '无法创建连接'
        reject(e)
      }
    })
  }

  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'sync', timestamp: Date.now() })
      }
    }, 5000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.errorMessage.value = '连接已断开，重连失败'
      return
    }

    this.reconnectAttempts++
    setTimeout(() => {
      if (this.connectionStatus.value === 'disconnected') {
        this.connect().catch(() => {})
      }
    }, this.reconnectDelay)
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connectionStatus.value = 'disconnected'
    this.mode.value = 'offline'
    this.currentRoom.value = null
    this.remotePlayers.value = []
  }

  private send(message: SyncMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private handleMessage(message: SyncMessage) {
    switch (message.type) {
      case 'room_info':
        this.currentRoom.value = message.data as RoomInfo
        this.remotePlayers.value = this.currentRoom.value.players.filter(
          (p) => p.id !== this.localPlayerId.value
        )
        if (this.onSyncCallback) {
          this.onSyncCallback(this.remotePlayers.value)
        }
        break

      case 'jump':
        if (this.onJumpCallback && message.playerId && message.data) {
          this.onJumpCallback(message.playerId, message.data.grade, message.timestamp)
        }
        if (message.playerId && message.data) {
          const player = this.remotePlayers.value.find((p) => p.id === message.playerId)
          if (player) {
            player.score = message.data.score
            player.combo = message.data.combo
          }
        }
        break

      case 'start':
        if (this.currentRoom.value) {
          this.currentRoom.value.isPlaying = true
        }
        if (this.onGameStartCallback) {
          this.onGameStartCallback()
        }
        break

      case 'join':
        if (message.data) {
          const newPlayer = message.data as PlayerState
          this.remotePlayers.value.push(newPlayer)
          if (this.currentRoom.value) {
            this.currentRoom.value.players.push(newPlayer)
          }
          if (this.onPlayerJoinCallback) {
            this.onPlayerJoinCallback(newPlayer)
          }
        }
        break

      case 'leave':
        if (message.playerId) {
          this.remotePlayers.value = this.remotePlayers.value.filter(
            (p) => p.id !== message.playerId
          )
          if (this.currentRoom.value) {
            this.currentRoom.value.players = this.currentRoom.value.players.filter(
              (p) => p.id !== message.playerId
            )
          }
          if (this.onPlayerLeaveCallback) {
            this.onPlayerLeaveCallback(message.playerId)
          }
        }
        break

      case 'chat':
        if (message.playerName && message.data) {
          this.chatMessages.value.push({
            playerName: message.playerName,
            message: message.data,
            time: message.timestamp,
          })
        }
        break

      case 'game_over':
        if (message.playerId) {
          const player = this.remotePlayers.value.find((p) => p.id === message.playerId)
          if (player) {
            player.isGameOver = true
          }
          if (this.onGameOverCallback) {
            this.onGameOverCallback(message.playerId)
          }
        }
        break

      case 'sync':
        if (message.data) {
          this.remotePlayers.value = message.data
          if (this.onSyncCallback) {
            this.onSyncCallback(this.remotePlayers.value)
          }
        }
        break
    }
  }

  createRoom(roomName: string, levelId: number = 1): Promise<RoomInfo> {
    return new Promise((resolve, reject) => {
      if (this.connectionStatus.value !== 'connected') {
        reject(new Error('未连接到服务器'))
        return
      }

      const roomId = this.generateRoomId()
      const roomInfo: RoomInfo = {
        id: roomId,
        name: roomName,
        hostId: this.localPlayerId.value,
        players: [
          {
            id: this.localPlayerId.value,
            name: this.localPlayerName.value,
            score: 0,
            combo: 0,
            isReady: false,
            isGameOver: false,
          },
        ],
        maxPlayers: 2,
        isPlaying: false,
        levelId,
      }

      this.currentRoom.value = roomInfo

      this.send({
        type: 'room_info',
        data: roomInfo,
        timestamp: Date.now(),
      })

      setTimeout(() => resolve(roomInfo), 100)
    })
  }

  joinRoom(roomId: string): Promise<RoomInfo> {
    return new Promise((resolve, reject) => {
      if (this.connectionStatus.value !== 'connected') {
        reject(new Error('未连接到服务器'))
        return
      }

      this.send({
        type: 'join',
        playerId: this.localPlayerId.value,
        playerName: this.localPlayerName.value,
        data: { roomId },
        timestamp: Date.now(),
      })

      setTimeout(() => {
        if (this.currentRoom.value) {
          resolve(this.currentRoom.value)
        } else {
          reject(new Error('加入房间失败'))
        }
      }, 1000)
    })
  }

  leaveRoom() {
    if (this.currentRoom.value) {
      this.send({
        type: 'leave',
        playerId: this.localPlayerId.value,
        timestamp: Date.now(),
      })
    }
    this.currentRoom.value = null
    this.remotePlayers.value = []
  }

  sendReady(isReady: boolean) {
    if (this.currentRoom.value) {
      const localPlayer = this.currentRoom.value.players.find(
        (p) => p.id === this.localPlayerId.value
      )
      if (localPlayer) {
        localPlayer.isReady = isReady
      }

      this.send({
        type: 'ready',
        playerId: this.localPlayerId.value,
        data: { isReady },
        timestamp: Date.now(),
      })
    }
  }

  sendJump(grade: TimingGrade, score: number, combo: number) {
    if (this.mode.value === 'online' && this.currentRoom.value) {
      this.send({
        type: 'jump',
        playerId: this.localPlayerId.value,
        playerName: this.localPlayerName.value,
        data: { grade, score, combo },
        timestamp: Date.now(),
      })
    }
  }

  sendGameOver() {
    if (this.mode.value === 'online' && this.currentRoom.value) {
      const localPlayer = this.currentRoom.value.players.find(
        (p) => p.id === this.localPlayerId.value
      )
      if (localPlayer) {
        localPlayer.isGameOver = true
      }

      this.send({
        type: 'game_over',
        playerId: this.localPlayerId.value,
        timestamp: Date.now(),
      })
    }
  }

  sendChat(message: string) {
    this.send({
      type: 'chat',
      playerId: this.localPlayerId.value,
      playerName: this.localPlayerName.value,
      data: message,
      timestamp: Date.now(),
    })
  }

  startGame() {
    if (this.currentRoom.value) {
      this.currentRoom.value.isPlaying = true
      this.send({
        type: 'start',
        playerId: this.localPlayerId.value,
        data: { startTime: Date.now() },
        timestamp: Date.now(),
      })

      if (this.onGameStartCallback) {
        this.onGameStartCallback()
      }
    }
  }

  startLocalAI(levelId: number = 1) {
    this.mode.value = 'local_ai'
    this.aiBeatCounter = 0
    this.aiJumpCooldown = 0

    this.remotePlayers.value = [
      {
        id: 'ai_player',
        name: 'AI 对手',
        score: 0,
        combo: 0,
        isReady: true,
        isGameOver: false,
      },
    ]

    const levels: Record<number, { initialBpm: number; maxBpm: number; difficulty: number }> = {
      1: { initialBpm: 60, maxBpm: 120, difficulty: 0.3 },
      2: { initialBpm: 80, maxBpm: 160, difficulty: 0.4 },
      3: { initialBpm: 100, maxBpm: 180, difficulty: 0.5 },
      4: { initialBpm: 80, maxBpm: 200, difficulty: 0.6 },
      5: { initialBpm: 120, maxBpm: 220, difficulty: 0.8 },
    }

    const level = levels[levelId] || levels[1]
    aiEngine.init(level.initialBpm, level.maxBpm, level.difficulty)

    this.currentRoom.value = {
      id: 'local_ai_room',
      name: '本地 AI 对战',
      hostId: this.localPlayerId.value,
      players: [
        {
          id: this.localPlayerId.value,
          name: this.localPlayerName.value,
          score: 0,
          combo: 0,
          isReady: true,
          isGameOver: false,
        },
        this.remotePlayers.value[0],
      ],
      maxPlayers: 2,
      isPlaying: false,
      levelId,
    }
  }

  updateAI(beatInterval: number, dt: number): boolean {
    if (this.mode.value !== 'local_ai') return false

    this.aiJumpCooldown -= dt

    if (this.aiJumpCooldown <= 0) {
      const aiPlayer = this.remotePlayers.value.find((p) => p.id === 'ai_player')
      if (aiPlayer && !aiPlayer.isGameOver) {
        const jumpChance = aiEngine.getAggressiveness() * 0.8
        if (Math.random() < jumpChance) {
          const rand = Math.random()
          let grade: TimingGrade
          if (rand > 0.7) {
            grade = 'perfect'
          } else if (rand > 0.4) {
            grade = 'great'
          } else if (rand > 0.15) {
            grade = 'good'
          } else {
            grade = 'miss'
          }

          const points = { perfect: 3, great: 2, good: 1, miss: 0 }[grade]
          aiPlayer.score += points
          if (grade !== 'miss') {
            aiPlayer.combo++
          } else {
            aiPlayer.combo = 0
          }

          aiEngine.onPlayerGrade(grade)
          this.aiJumpCooldown = beatInterval * (0.8 + Math.random() * 0.4)

          if (this.onJumpCallback) {
            this.onJumpCallback('ai_player', grade, Date.now())
          }

          return true
        }
      }
    }

    return false
  }

  stopLocalAI() {
    this.mode.value = 'offline'
    this.remotePlayers.value = []
    this.currentRoom.value = null
  }
}

let _multiplayerEngine: MultiplayerEngine | null = null

export function useMultiplayer(): MultiplayerEngine {
  if (!_multiplayerEngine) {
    _multiplayerEngine = new MultiplayerEngine()
  }
  return _multiplayerEngine
}
