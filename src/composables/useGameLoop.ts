import { type Ref, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import {
  POLE_THICKNESS,
  POLE_CLOSE_GAP,
  DANCER_WIDTH,
  POLE_LENGTH_RATIO,
  type PolePair,
  type Dancer,
  type Operator,
  type Particle,
  type BeatFlash,
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
} from '@/game/renderer'

export function useGameLoop(canvasRef: Ref<HTMLCanvasElement | null>) {
  const store = useGameStore()

  const poles = ref<PolePair[]>([])
  const dancer = ref<Dancer>({} as Dancer)
  const operators = ref<Operator[]>([])
  const particles = ref<Particle[]>([])
  const beatFlashes = ref<BeatFlash[]>([])
  const isBeat = ref(false)
  const beatProgress = ref(0)
  const polesOpen = ref(true)

  let animFrameId = 0
  let lastTime = 0
  let lastBeatTime = 0
  let prevCanvasWidth = 0
  let prevCanvasHeight = 0

  function initGame() {
    const canvas = canvasRef.value
    if (!canvas) return

    const w = canvas.width
    const h = canvas.height
    prevCanvasWidth = w
    prevCanvasHeight = h

    poles.value = createPoles(w, h)
    poles.value = openPoles(poles.value)
    dancer.value = createDancer(w, h)
    operators.value = createOperators(w, h)
    particles.value = []
    beatFlashes.value = []
    polesOpen.value = true
    lastBeatTime = performance.now()
  }

  function handleJump() {
    if (store.gameState !== 'playing') return
    if (dancer.value.state !== 'standing') return

    const canvas = canvasRef.value
    if (!canvas) return

    dancer.value = startDancerJump(dancer.value, poles.value, canvas.width, canvas.height)

    if (dancer.value.state === 'jumping') {
      particles.value = [
        ...particles.value,
        ...createDustParticles(dancer.value.startX, dancer.value.startY),
      ]
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

  function gameLoop(time: number) {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dt = Math.min(time - lastTime, 50)
    lastTime = time

    if (store.gameState === 'playing') {
      const beatInterval = store.beatInterval
      const elapsed = time - lastBeatTime
      beatProgress.value = Math.min(elapsed / beatInterval, 1)

      if (elapsed >= beatInterval) {
        lastBeatTime = time
        isBeat.value = true
        store.onBeat(time)
        togglePoles(canvas.width)

        operators.value = operators.value.map((op) => ({
          ...op,
          targetArmAngle: polesOpen.value
            ? -0.5 * (op.side === 'left' ? 1 : -1)
            : 0.3 * (op.side === 'left' ? 1 : -1),
        }))

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
          setTimeout(() => store.gameOver(), 300)
        }
      }

      if (prevDancerState === 'jumping' && dancer.value.state === 'standing') {
        store.addScore()
        particles.value = [
          ...particles.value,
          ...createDustParticles(dancer.value.x, dancer.value.y),
          ...createSparkParticles(dancer.value.x, dancer.value.y - 25),
        ]

        if (dancer.value.currentGap === -1) {
          dancer.value = resetDancerToStart(dancer.value, canvas.width, canvas.height)
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
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawBackground(ctx, canvas.width, canvas.height)
    drawPoles(ctx, poles.value, canvas.width)
    drawOperators(ctx, operators.value)
    drawDancer(ctx, dancer.value)
    drawParticles(ctx, particles.value)
    drawBeatFlash(ctx, beatFlashes.value)

    if (store.gameState === 'playing') {
      drawRhythmIndicator(
        ctx,
        canvas.width / 2,
        40,
        store.bpm,
        beatProgress.value,
        isBeat.value
      )
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
    store.startGame()
    initGame()
    lastBeatTime = performance.now()
    lastTime = performance.now()
    polesOpen.value = true
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
  })

  onUnmounted(() => {
    cancelAnimationFrame(animFrameId)
    window.removeEventListener('resize', resizeCanvas)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('pointerdown', onPointerDown)
  })

  return {
    poles,
    dancer,
    operators,
    startGame,
    restartGame,
    handleJump,
  }
}
