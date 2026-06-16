import { type Ref, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import {
  POLE_THICKNESS,
  POLE_CLOSE_GAP,
  DANCER_WIDTH,
  POLE_LENGTH_RATIO,
  GRADE_COLORS,
  GRADE_POINTS,
  RHYTHM_LABELS,
  type TimingGrade,
  type TimingResult,
  type PolePair,
  type Dancer,
  type Operator,
  type Particle,
  type BeatFlash,
  type TimingPopup,
} from '@/game/constants'
import {
  createPoles,
  createDancer,
  createOperators,
  openPoles,
  closePoles,
  updatePoles,
  startDancerJump,
  updateDancer,
  resetDancerToStart,
  createDustParticles,
  createLeafParticles,
  createSparkParticles,
  updateParticles,
  drawBackground,
  drawPoles,
  drawDancer,
  drawOperators,
  drawParticles,
  drawBeatFlash,
  drawRhythmIndicator,
  drawTimingPopups,
  drawTimingWindow,
  drawLevelInfo,
  drawCountdown,
  updateTimingPopups,
} from '@/game/renderer'
import { audioEngine } from '@/game/audio'
import { rhythmEngine } from '@/game/rhythm'
import { aiEngine } from '@/game/ai'
import { useMultiplayer } from '@/game/multiplayer'

export function useGameLoop(canvasRef: Ref<HTMLCanvasElement | null>) {
  const store = useGameStore()
  const multiplayer = useMultiplayer()

  const poles = ref<PolePair[]>([])
  const dancer = ref<Dancer>({} as Dancer)
  const operators = ref<Operator[]>([])
  const particles = ref<Particle[]>([])
  const beatFlashes = ref<BeatFlash[]>([])
  const timingPopups = ref<TimingPopup[]>([])
  const isBeat = ref(false)
  const beatProgress = ref(0)
  const polesOpen = ref(true)
  const countdown = ref(0)
  const ghostDancer = ref<Dancer | null>(null)
  const remoteDancers = ref<Map<string, Dancer>>(new Map())

  let animFrameId = 0
  let lastTime = 0
  let lastBeatTime = 0
  let prevCanvasWidth = 0
  let prevCanvasHeight = 0
  let poleCount = 4
  let nextBeatInterval = 0
  let variableBeatLabel = ''
  let ghostFrameIndex = 0

  function initGame() {
    const canvas = canvasRef.value
    if (!canvas) return

    const w = canvas.width
    const h = canvas.height
    prevCanvasWidth = w
    prevCanvasHeight = h

    poleCount = store.currentLevel.polePairs
    poles.value = createPoles(w, h, poleCount)
    poles.value = openPoles(poles.value)
    dancer.value = createDancer(w, h, poleCount)
    operators.value = createOperators(w, h, poleCount)
    particles.value = []
    beatFlashes.value = []
    timingPopups.value = []
    polesOpen.value = true
    lastBeatTime = performance.now()
    nextBeatInterval = store.beatInterval
    variableBeatLabel = ''
    ghostFrameIndex = 0

    if (store.competitionMode && store.ghost) {
      ghostDancer.value = createDancer(w, h, poleCount)
    } else {
      ghostDancer.value = null
    }

    if (multiplayer.mode.value !== 'offline') {
      initRemoteDancers(w, h, poleCount)
    } else {
      remoteDancers.value.clear()
    }
  }

  function initRemoteDancers(w: number, h: number, poleCount: number) {
    remoteDancers.value.clear()
    for (const player of multiplayer.remotePlayers.value) {
      if (!player.isGameOver) {
        remoteDancers.value.set(player.id, createDancer(w, h, poleCount))
      }
    }
  }

  function judgeTiming(): TimingGrade {
    const windows = store.timingWindows
    const elapsed = performance.now() - lastBeatTime
    const interval = store.beatInterval
    const distToBeat = Math.min(elapsed, interval - elapsed)

    if (distToBeat <= windows[0]) return 'perfect'
    if (distToBeat <= windows[1]) return 'great'
    if (distToBeat <= windows[2]) return 'good'
    return 'miss'
  }

  function handleJump() {
    if (store.gameState !== 'playing') return
    if (countdown.value > 0) return
    if (dancer.value.state !== 'standing') return

    const canvas = canvasRef.value
    if (!canvas) return

    const grade = judgeTiming()
    dancer.value = startDancerJump(dancer.value, poles.value, canvas.width, canvas.height, poleCount)

    if (dancer.value.state === 'jumping') {
      store.addScore(grade)
      store.recordReplayFrame('jump')

      if (store.useAI) {
        aiEngine.onPlayerGrade(grade)
      }

      if (multiplayer.mode.value !== 'offline') {
        multiplayer.sendJump(grade, store.score, store.combo)
      }

      particles.value = [
        ...particles.value,
        ...createDustParticles(dancer.value.startX, dancer.value.startY),
      ]

      timingPopups.value.push({
        x: dancer.value.startX,
        y: dancer.value.startY - 60,
        text: grade === 'perfect' ? '完美!' : grade === 'great' ? '太棒了!' : grade === 'good' ? '不错' : '失误',
        color: GRADE_COLORS[grade],
        life: 1,
        maxLife: 1,
      })

      if (store.soundEnabled) {
        if (grade === 'perfect') audioEngine.playPerfect()
        else if (grade === 'great') audioEngine.playGreat()
        else if (grade === 'good') audioEngine.playGood()
        else audioEngine.playMiss()
        audioEngine.playJump()
      }
    }
  }

  function checkCollisionEveryFrame(canvasWidth: number): boolean {
    if (dancer.value.state === 'jumping' || dancer.value.state === 'caught') return false

    const poleLength = canvasWidth * POLE_LENGTH_RATIO

    for (const pole of poles.value) {
      const gap = pole.lowerY - pole.upperY - POLE_THICKNESS
      const poleLeft = pole.x - poleLength / 2
      const poleRight = pole.x + poleLength / 2

      const dancerLeft = dancer.value.x - DANCER_WIDTH / 2
      const dancerRight = dancer.value.x + DANCER_WIDTH / 2

      if (dancerRight > poleLeft && dancerLeft < poleRight) {
        if (gap < POLE_CLOSE_GAP * 4) {
          return true
        }
      }
    }
    return false
  }

  function togglePoles(canvasWidth: number) {
    if (store.useAI) {
      const aiAction = aiEngine.generatePoleAction(poleCount, store.beatCount)
      if (aiAction.action === 'close') {
        poles.value = closePoles(poles.value, aiAction.poleIndices)
        polesOpen.value = false
      } else {
        poles.value = openPoles(poles.value, aiAction.poleIndices)
        polesOpen.value = true
      }

      for (const idx of aiAction.poleIndices) {
        if (poles.value[idx]) {
          beatFlashes.value.push({
            x: poles.value[idx].x,
            y: (poles.value[idx].upperY + poles.value[idx].lowerY) / 2,
            radius: 30,
            alpha: 0.6,
          })
        }
      }
      return
    }

    const rhythmAction = rhythmEngine.getCurrentPoleAction(store.beatCount, poleCount)

    if (rhythmAction) {
      if (rhythmAction.action === 'close') {
        poles.value = closePoles(poles.value, rhythmAction.poleIndices)
        polesOpen.value = false
      } else {
        poles.value = openPoles(poles.value, rhythmAction.poleIndices)
        polesOpen.value = true
      }

      for (const idx of rhythmAction.poleIndices) {
        if (poles.value[idx]) {
          beatFlashes.value.push({
            x: poles.value[idx].x,
            y: (poles.value[idx].upperY + poles.value[idx].lowerY) / 2,
            radius: 30,
            alpha: 0.8,
          })
        }
      }
      return
    }

    if (polesOpen.value) {
      poles.value = closePoles(poles.value)
      polesOpen.value = false

      for (const pole of poles.value) {
        beatFlashes.value.push({
          x: pole.x,
          y: (pole.upperY + pole.lowerY) / 2,
          radius: 30,
          alpha: 0.8,
        })
      }
    } else {
      poles.value = openPoles(poles.value)
      polesOpen.value = true
    }
  }

  function updateGhost(elapsed: number, dt: number) {
    if (!store.ghost || !store.competitionMode || !ghostDancer.value) return

    const canvas = canvasRef.value
    if (!canvas) return

    while (ghostFrameIndex < store.ghost.frames.length) {
      const frame = store.ghost.frames[ghostFrameIndex]
      if (frame.time <= elapsed) {
        store.updateGhostScore(frame.score)

        if (ghostDancer.value && ghostDancer.value.state === 'standing') {
          ghostDancer.value = startDancerJump(
            ghostDancer.value,
            poles.value,
            canvas.width,
            canvas.height,
            poleCount
          )
        }

        ghostFrameIndex++
      } else {
        break
      }
    }

    if (ghostDancer.value) {
      const prevGhostState = ghostDancer.value.state
      ghostDancer.value = updateDancer(ghostDancer.value, dt)

      if (prevGhostState === 'jumping' && ghostDancer.value.state === 'standing') {
        if (ghostDancer.value.currentGap === -1) {
          ghostDancer.value = resetDancerToStart(
            ghostDancer.value,
            canvas.width,
            canvas.height,
            poleCount
          )
        }
      }
    }
  }

  function updateRemoteDancers(dt: number) {
    if (multiplayer.mode.value === 'offline') return

    const canvas = canvasRef.value
    if (!canvas) return

    for (const [playerId, remoteDancer] of remoteDancers.value) {
      const player = multiplayer.remotePlayers.value.find((p) => p.id === playerId)
      if (!player || player.isGameOver) continue

      const prevState = remoteDancer.state
      const updatedDancer = updateDancer(remoteDancer, dt)

      if (prevState === 'jumping' && updatedDancer.state === 'standing') {
        if (updatedDancer.currentGap === -1) {
          remoteDancers.value.set(
            playerId,
            resetDancerToStart(updatedDancer, canvas.width, canvas.height, poleCount)
          )
        } else {
          remoteDancers.value.set(playerId, updatedDancer)
        }
      } else {
        remoteDancers.value.set(playerId, updatedDancer)
      }
    }
  }

  function triggerRemoteJump(playerId: string) {
    const canvas = canvasRef.value
    if (!canvas) return

    const remoteDancer = remoteDancers.value.get(playerId)
    if (!remoteDancer || remoteDancer.state !== 'standing') return

    remoteDancers.value.set(
      playerId,
      startDancerJump(remoteDancer, poles.value, canvas.width, canvas.height, poleCount)
    )
  }

  function gameLoop(time: number) {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dt = Math.min(time - lastTime, 50)
    lastTime = time

    if (store.gameState === 'playing' && countdown.value <= 0) {
      const currentInterval = store.useAI ? aiEngine.getCurrentBpm() : store.bpm
      const beatInterval = rhythmEngine.getNextBeatInterval(currentInterval, store.beatCount)
      const elapsed = time - lastBeatTime
      beatProgress.value = Math.min(elapsed / beatInterval, 1)

      if (elapsed >= beatInterval) {
        lastBeatTime = time
        isBeat.value = true
        store.onBeat(time)

        if (store.useAI) {
          aiEngine.onBeat()
          store.bpm = aiEngine.getCurrentBpm()
        }

        togglePoles(canvas.width)

        operators.value = operators.value.map((op) => ({
          ...op,
          targetArmAngle: polesOpen.value
            ? -0.5 * (op.side === 'left' ? 1 : -1)
            : 0.3 * (op.side === 'left' ? 1 : -1),
        }))

        const strong = store.beatCount % 4 === 0
        if (store.soundEnabled) {
          audioEngine.playBeat(strong)
          if (!polesOpen.value) {
            audioEngine.playBambooHit()
          } else {
            audioEngine.playBambooOpen()
          }
        }

        variableBeatLabel = rhythmEngine.getVariableBeatLabel()

        setTimeout(() => {
          isBeat.value = false
        }, 100)
      }

      poles.value = updatePoles(poles.value, dt)
      const prevDancerState = dancer.value.state
      dancer.value = updateDancer(dancer.value, dt)

      if (!polesOpen.value) {
        if (checkCollisionEveryFrame(canvas.width)) {
          dancer.value = { ...dancer.value, state: 'caught' }
          if (store.soundEnabled) audioEngine.playGameOver()

          if (multiplayer.mode.value !== 'offline') {
            multiplayer.sendGameOver()
          }

          setTimeout(() => store.gameOver(), 300)
        }
      }

      if (prevDancerState === 'jumping' && dancer.value.state === 'standing') {
        if (store.soundEnabled) audioEngine.playLand()

        particles.value = [
          ...particles.value,
          ...createDustParticles(dancer.value.x, dancer.value.y),
          ...createSparkParticles(dancer.value.x, dancer.value.y - 25),
        ]

        if (dancer.value.currentGap === -1) {
          dancer.value = resetDancerToStart(dancer.value, canvas.width, canvas.height, poleCount)
        }
      }

      operators.value = operators.value.map((op) => ({
        ...op,
        armAngle: op.armAngle + (op.targetArmAngle - op.armAngle) * 0.1,
      }))

      particles.value = [
        ...particles.value,
        ...createLeafParticles(canvas.width, canvas.height),
      ]
      particles.value = updateParticles(particles.value, dt)

      beatFlashes.value = beatFlashes.value
        .map((f) => ({ ...f, alpha: f.alpha - 0.03, radius: f.radius + 2 }))
        .filter((f) => f.alpha > 0)

      timingPopups.value = updateTimingPopups(timingPopups.value, dt)

      if (store.competitionMode) {
        updateGhost(time - store.gameStartTime, dt)
      }

      if (multiplayer.mode.value !== 'offline') {
        if (multiplayer.mode.value === 'local_ai') {
          const aiJumped = multiplayer.updateAI(store.beatInterval, dt)
          if (aiJumped) {
            triggerRemoteJump('ai_player')
          }
        }
        updateRemoteDancers(dt)
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawBackground(ctx, canvas.width, canvas.height)
    drawPoles(ctx, poles.value, canvas.width)
    drawOperators(ctx, operators.value)

    if (store.competitionMode && ghostDancer.value) {
      drawDancer(ctx, ghostDancer.value, true)
    }

    for (const [playerId, remoteDancer] of remoteDancers.value) {
      const player = multiplayer.remotePlayers.value.find((p) => p.id === playerId)
      if (player && !player.isGameOver) {
        drawDancer(ctx, remoteDancer, true)
      }
    }

    drawDancer(ctx, dancer.value)
    drawParticles(ctx, particles.value)
    drawBeatFlash(ctx, beatFlashes.value)
    drawTimingPopups(ctx, timingPopups.value)

    if (store.gameState === 'playing' && countdown.value <= 0) {
      drawRhythmIndicator(
        ctx,
        canvas.width / 2,
        40,
        store.bpm,
        beatProgress.value,
        isBeat.value,
        variableBeatLabel || RHYTHM_LABELS[store.rhythmMode]
      )

      drawLevelInfo(ctx, canvas.width / 2, 80, store.currentLevel)

      drawTimingWindow(
        ctx,
        canvas.width / 2,
        canvas.height - 30,
        beatProgress.value,
        store.timingWindows,
        store.beatInterval
      )
    }

    if (countdown.value > 0) {
      drawCountdown(ctx, canvas.width, canvas.height, countdown.value)
    }

    animFrameId = requestAnimationFrame(gameLoop)
  }

  function rescaleEntities(oldW: number, oldH: number, newW: number, newH: number) {
    const scaleX = newW / oldW
    const scaleY = newH / oldH

    poles.value = poles.value.map((p) => ({
      ...p,
      x: p.x * scaleX,
      upperY: p.upperY * scaleY,
      lowerY: p.lowerY * scaleY,
      targetUpperY: p.targetUpperY * scaleY,
      targetLowerY: p.targetLowerY * scaleY,
    }))

    dancer.value = {
      ...dancer.value,
      x: dancer.value.x * scaleX,
      y: dancer.value.y * scaleY,
      baseY: dancer.value.baseY * scaleY,
      targetX: dancer.value.targetX * scaleX,
      targetY: dancer.value.targetY * scaleY,
      startX: dancer.value.startX * scaleX,
      startY: dancer.value.startY * scaleY,
    }

    operators.value = operators.value.map((op) => ({
      ...op,
      x: op.x * scaleX,
      y: op.y * scaleY,
    }))

    particles.value = particles.value.map((p) => ({
      ...p,
      x: p.x * scaleX,
      y: p.y * scaleY,
    }))

    beatFlashes.value = beatFlashes.value.map((f) => ({
      ...f,
      x: f.x * scaleX,
      y: f.y * scaleY,
      radius: f.radius * ((scaleX + scaleY) / 2),
    }))

    timingPopups.value = timingPopups.value.map((p) => ({
      ...p,
      x: p.x * scaleX,
      y: p.y * scaleY,
    }))

    if (ghostDancer.value) {
      ghostDancer.value = {
        ...ghostDancer.value,
        x: ghostDancer.value.x * scaleX,
        y: ghostDancer.value.y * scaleY,
        baseY: ghostDancer.value.baseY * scaleY,
        targetX: ghostDancer.value.targetX * scaleX,
        targetY: ghostDancer.value.targetY * scaleY,
        startX: ghostDancer.value.startX * scaleX,
        startY: ghostDancer.value.startY * scaleY,
      }
    }

    for (const [playerId, remoteDancer] of remoteDancers.value) {
      remoteDancers.value.set(playerId, {
        ...remoteDancer,
        x: remoteDancer.x * scaleX,
        y: remoteDancer.y * scaleY,
        baseY: remoteDancer.baseY * scaleY,
        targetX: remoteDancer.targetX * scaleX,
        targetY: remoteDancer.targetY * scaleY,
        startX: remoteDancer.startX * scaleX,
        startY: remoteDancer.startY * scaleY,
      })
    }
  }

  function resizeCanvas() {
    const canvas = canvasRef.value
    if (!canvas) return
    const container = canvas.parentElement
    if (!container) return

    const oldW = prevCanvasWidth || canvas.width
    const oldH = prevCanvasHeight || canvas.height
    const newW = container.clientWidth
    const newH = container.clientHeight

    canvas.width = newW
    canvas.height = newH

    if (store.gameState === 'idle') {
      initGame()
    } else if (oldW > 0 && oldH > 0 && (oldW !== newW || oldH !== newH)) {
      rescaleEntities(oldW, oldH, newW, newH)
    }

    prevCanvasWidth = newW
    prevCanvasHeight = newH
  }

  function startGame() {
    audioEngine.init()

    const level = store.currentLevel
    poleCount = level.polePairs
    rhythmEngine.setLevel(level)

    if (store.useAI) {
      aiEngine.init(level.initialBpm, level.maxBpm, level.difficulty === 'easy' ? 0.2 : level.difficulty === 'normal' ? 0.4 : level.difficulty === 'hard' ? 0.6 : 0.8)
    }

    if (store.customPattern && store.rhythmMode === 'custom') {
      rhythmEngine.setCustomPattern(store.customPattern)
    }

    store.startGame()
    initGame()

    if (store.soundEnabled) audioEngine.playStart()

    countdown.value = 3
    const countdownInterval = setInterval(() => {
      countdown.value--
      if (store.soundEnabled) audioEngine.playCountdown()
      if (countdown.value <= 0) {
        clearInterval(countdownInterval)
        lastBeatTime = performance.now()
        lastTime = performance.now()
        polesOpen.value = true
      }
    }, 800)
  }

  function restartGame() {
    store.resetGame()
    startGame()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault()
      handleJump()
    }
  }

  function onPointerDown(e: PointerEvent) {
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON') return
    handleJump()
  }

  onMounted(() => {
    resizeCanvas()
    initGame()
    lastTime = performance.now()
    animFrameId = requestAnimationFrame(gameLoop)

    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)

    multiplayer.setOnJumpCallback((playerId) => {
      triggerRemoteJump(playerId)
    })

    multiplayer.setOnGameStartCallback(() => {
      if (store.gameState === 'idle') {
        startGame()
      }
    })
  })

  onUnmounted(() => {
    cancelAnimationFrame(animFrameId)
    window.removeEventListener('resize', resizeCanvas)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('pointerdown', onPointerDown)

    if (multiplayer.mode.value === 'local_ai') {
      multiplayer.stopLocalAI()
    } else if (multiplayer.mode.value === 'online') {
      multiplayer.leaveRoom()
      multiplayer.disconnect()
    }
  })

  return {
    poles,
    dancer,
    operators,
    ghostDancer,
    remoteDancers,
    startGame,
    restartGame,
    handleJump,
    multiplayer,
  }
}
