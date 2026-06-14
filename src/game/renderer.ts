import {
  POLE_PAIRS,
  POLE_THICKNESS,
  POLE_OPEN_GAP,
  POLE_CLOSE_GAP,
  POLE_LENGTH_RATIO,
  POLE_SPACING_RATIO,
  POLE_START_X_RATIO,
  UPPER_POLE_BASE_Y_RATIO,
  LOWER_POLE_BASE_Y_RATIO,
  DANCER_WIDTH,
  DANCER_HEIGHT,
  JUMP_DURATION,
  GROUND_OFFSET,
  COLORS,
  type PolePair,
  type Dancer,
  type Operator,
  type Particle,
  type BeatFlash,
} from './constants'

export function createPoles(canvasWidth: number, canvasHeight: number): PolePair[] {
  const poles: PolePair[] = []
  const startX = canvasWidth * POLE_START_X_RATIO
  const spacing = canvasWidth * POLE_SPACING_RATIO
  const upperBaseY = canvasHeight * UPPER_POLE_BASE_Y_RATIO
  const lowerBaseY = canvasHeight * LOWER_POLE_BASE_Y_RATIO

  for (let i = 0; i < POLE_PAIRS; i++) {
    const x = startX + i * spacing
    poles.push({
      x,
      upperY: upperBaseY,
      lowerY: lowerBaseY,
      targetUpperY: upperBaseY,
      targetLowerY: lowerBaseY,
      state: 'open',
      openProgress: 1,
    })
  }
  return poles
}

export function createDancer(canvasWidth: number, canvasHeight: number): Dancer {
  const startX = canvasWidth * POLE_START_X_RATIO
  const spacing = canvasWidth * POLE_SPACING_RATIO
  const lowerBaseY = canvasHeight * LOWER_POLE_BASE_Y_RATIO

  const firstGapX = startX - spacing * 0.6
  const baseY = lowerBaseY - POLE_THICKNESS / 2

  return {
    x: firstGapX,
    y: baseY,
    baseY,
    targetX: firstGapX,
    targetY: baseY,
    startX: firstGapX,
    startY: baseY,
    currentGap: -1,
    state: 'standing',
    jumpProgress: 0,
    jumpStartGap: -1,
  }
}

export function createOperators(canvasWidth: number, canvasHeight: number): Operator[] {
  const startX = canvasWidth * POLE_START_X_RATIO
  const spacing = canvasWidth * POLE_SPACING_RATIO
  const operatorY = canvasHeight * LOWER_POLE_BASE_Y_RATIO

  return [
    {
      x: startX - spacing * 0.85,
      y: operatorY,
      armAngle: -0.5,
      targetArmAngle: -0.5,
      side: 'left' as const,
    },
    {
      x: startX + (POLE_PAIRS - 1) * spacing + spacing * 0.85,
      y: operatorY,
      armAngle: 0.5,
      targetArmAngle: 0.5,
      side: 'right' as const,
    },
  ]
}

export function openPoles(poles: PolePair[]): PolePair[] {
  return poles.map((p) => ({
    ...p,
    state: 'opening' as const,
    targetUpperY: p.upperY - POLE_OPEN_GAP / 2,
    targetLowerY: p.lowerY + POLE_OPEN_GAP / 2,
  }))
}

export function closePoles(poles: PolePair[]): PolePair[] {
  return poles.map((p) => ({
    ...p,
    state: 'closing' as const,
    targetUpperY: p.upperY + POLE_OPEN_GAP / 2,
    targetLowerY: p.lowerY - POLE_OPEN_GAP / 2,
  }))
}

export function updatePoles(poles: PolePair[], dt: number): PolePair[] {
  const speed = 0.012
  return poles.map((p) => {
    const diffUpper = p.targetUpperY - p.upperY
    const diffLower = p.targetLowerY - p.lowerY
    const newUpperY = p.upperY + diffUpper * speed * dt
    const newLowerY = p.lowerY + diffLower * speed * dt
    const gap = newLowerY - newUpperY - POLE_THICKNESS
    const newOpenProgress = Math.max(0, Math.min(1, gap / POLE_OPEN_GAP))

    let newState = p.state
    if (p.state === 'opening' && Math.abs(diffUpper) < 0.5) {
      newState = 'open'
    } else if (p.state === 'closing' && Math.abs(diffUpper) < 0.5) {
      newState = 'close'
    }

    return {
      ...p,
      upperY: newUpperY,
      lowerY: newLowerY,
      openProgress: newOpenProgress,
      state: newState,
    }
  })
}

export function startDancerJump(
  dancer: Dancer,
  poles: PolePair[],
  canvasWidth: number,
  canvasHeight: number
): Dancer {
  if (dancer.state !== 'standing') return dancer

  const spacing = canvasWidth * POLE_SPACING_RATIO
  const startX = canvasWidth * POLE_START_X_RATIO
  const nextGap = dancer.currentGap + 1
  let targetGap: number
  let targetX: number
  let targetY: number

  if (nextGap >= POLE_PAIRS) {
    targetGap = -1
    targetX = startX + POLE_PAIRS * spacing + spacing * 0.6
    targetY = dancer.baseY
  } else {
    targetGap = nextGap
    targetX = poles[nextGap].x
    targetY = poles[nextGap].lowerY - POLE_THICKNESS / 2
  }

  return {
    ...dancer,
    state: 'jumping',
    targetX,
    targetY,
    startX: dancer.x,
    startY: dancer.y,
    jumpProgress: 0,
    jumpStartGap: dancer.currentGap,
    currentGap: targetGap,
  }
}

export function updateDancer(dancer: Dancer, dt: number): Dancer {
  if (dancer.state === 'jumping') {
    const newProgress = dancer.jumpProgress + dt / JUMP_DURATION
    if (newProgress >= 1) {
      return {
        ...dancer,
        x: dancer.targetX,
        y: dancer.targetY,
        state: 'standing',
        jumpProgress: 1,
        startX: dancer.targetX,
        startY: dancer.targetY,
      }
    }

    const t = newProgress
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    const newX = dancer.startX + (dancer.targetX - dancer.startX) * easeT
    const newY =
      dancer.startY + (dancer.targetY - dancer.startY) * easeT - Math.sin(t * Math.PI) * 100

    return {
      ...dancer,
      x: newX,
      y: newY,
      jumpProgress: newProgress,
    }
  }

  return dancer
}

export function checkCollision(
  dancer: Dancer,
  poles: PolePair[],
  canvasWidth: number
): boolean {
  if (dancer.state === 'jumping') return false

  const poleLength = canvasWidth * POLE_LENGTH_RATIO

  for (const pole of poles) {
    const gap = pole.lowerY - pole.upperY - POLE_THICKNESS
    const poleLeft = pole.x - poleLength / 2
    const poleRight = pole.x + poleLength / 2

    if (
      dancer.x + DANCER_WIDTH / 2 > poleLeft &&
      dancer.x - DANCER_WIDTH / 2 < poleRight
    ) {
      if (gap < POLE_CLOSE_GAP * 3) {
        return true
      }
    }
  }
  return false
}

export function resetDancerToStart(
  dancer: Dancer,
  canvasWidth: number,
  canvasHeight: number
): Dancer {
  const spacing = canvasWidth * POLE_SPACING_RATIO
  const startX = canvasWidth * POLE_START_X_RATIO
  const baseY = canvasHeight * LOWER_POLE_BASE_Y_RATIO - POLE_THICKNESS / 2
  const firstGapX = startX - spacing * 0.6

  return {
    ...dancer,
    x: firstGapX,
    y: baseY,
    baseY,
    targetX: firstGapX,
    targetY: baseY,
    startX: firstGapX,
    startY: baseY,
    currentGap: -1,
    state: 'standing',
    jumpProgress: 0,
    jumpStartGap: -1,
  }
}

export function createDustParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 2 - 1,
      life: 1,
      maxLife: 1,
      size: Math.random() * 4 + 2,
      color: COLORS.dustColor,
      type: 'dust',
    })
  }
  return particles
}

export function createLeafParticles(canvasWidth: number, canvasHeight: number): Particle[] {
  const particles: Particle[] = []
  if (Math.random() > 0.02) return particles

  particles.push({
    x: Math.random() * canvasWidth,
    y: -10,
    vx: Math.random() * 1 - 0.5,
    vy: Math.random() * 1.5 + 0.5,
    life: 1,
    maxLife: 1,
    size: Math.random() * 8 + 4,
    color: Math.random() > 0.5 ? COLORS.leafGreen : COLORS.leafLight,
    type: 'leaf',
  })
  return particles
}

export function createSparkParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * (Math.random() * 3 + 1),
      vy: Math.sin(angle) * (Math.random() * 3 + 1),
      life: 1,
      maxLife: 1,
      size: Math.random() * 3 + 1,
      color: COLORS.beatGlow,
      type: 'spark',
    })
  }
  return particles
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt * 0.06,
      y: p.y + p.vy * dt * 0.06,
      vy: p.type === 'leaf' ? p.vy : p.vy + 0.05 * dt * 0.06,
      life: p.life - dt * 0.002,
    }))
    .filter((p) => p.life > 0)
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, COLORS.sky[0])
  gradient.addColorStop(0.4, COLORS.sky[1])
  gradient.addColorStop(0.7, COLORS.sky[2])
  gradient.addColorStop(1, COLORS.ground)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)

  drawMountains(ctx, w, h)

  const groundY = h * (1 - GROUND_OFFSET)
  const groundGrad = ctx.createLinearGradient(0, groundY - 20, 0, h)
  groundGrad.addColorStop(0, COLORS.groundLight)
  groundGrad.addColorStop(0.3, COLORS.ground)
  groundGrad.addColorStop(1, '#2a1a0f')
  ctx.fillStyle = groundGrad
  ctx.fillRect(0, groundY - 5, w, h - groundY + 5)

  ctx.strokeStyle = COLORS.groundLight
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, groundY - 5)
  ctx.lineTo(w, groundY - 5)
  ctx.stroke()
}

function drawMountains(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const groundY = h * (1 - GROUND_OFFSET)

  ctx.fillStyle = COLORS.mountainFar
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  ctx.lineTo(w * 0.1, groundY - h * 0.15)
  ctx.lineTo(w * 0.25, groundY - h * 0.22)
  ctx.lineTo(w * 0.4, groundY - h * 0.12)
  ctx.lineTo(w * 0.55, groundY - h * 0.18)
  ctx.lineTo(w * 0.7, groundY - h * 0.25)
  ctx.lineTo(w * 0.85, groundY - h * 0.14)
  ctx.lineTo(w, groundY - h * 0.08)
  ctx.lineTo(w, groundY)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = COLORS.mountainNear
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  ctx.lineTo(w * 0.15, groundY - h * 0.08)
  ctx.lineTo(w * 0.3, groundY - h * 0.14)
  ctx.lineTo(w * 0.5, groundY - h * 0.06)
  ctx.lineTo(w * 0.65, groundY - h * 0.12)
  ctx.lineTo(w * 0.8, groundY - h * 0.07)
  ctx.lineTo(w, groundY - h * 0.1)
  ctx.lineTo(w, groundY)
  ctx.closePath()
  ctx.fill()
}

export function drawPole(ctx: CanvasRenderingContext2D, x: number, y: number, length: number) {
  const gradient = ctx.createLinearGradient(x, y - POLE_THICKNESS / 2, x, y + POLE_THICKNESS / 2)
  gradient.addColorStop(0, COLORS.bambooLight)
  gradient.addColorStop(0.3, COLORS.bamboo)
  gradient.addColorStop(0.7, COLORS.bamboo)
  gradient.addColorStop(1, COLORS.bambooDark)

  ctx.fillStyle = gradient
  ctx.beginPath()
  const r = POLE_THICKNESS / 2
  ctx.roundRect(x - length / 2, y - r, length, POLE_THICKNESS, r / 2)
  ctx.fill()

  ctx.strokeStyle = COLORS.bambooJoint
  ctx.lineWidth = 1.5
  const jointCount = Math.floor(length / 40)
  for (let i = 1; i <= jointCount; i++) {
    const jx = x - length / 2 + (length * i) / (jointCount + 1)
    ctx.beginPath()
    ctx.moveTo(jx, y - r + 2)
    ctx.lineTo(jx, y + r - 2)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(x - length / 2 + 3, y - r + 1, length - 6, 3)
}

export function drawPoles(ctx: CanvasRenderingContext2D, poles: PolePair[], canvasWidth: number) {
  const length = canvasWidth * POLE_LENGTH_RATIO
  for (const pole of poles) {
    drawPole(ctx, pole.x, pole.upperY, length)
    drawPole(ctx, pole.x, pole.lowerY, length)

    ctx.fillStyle = COLORS.shadow
    ctx.beginPath()
    ctx.ellipse(pole.x, pole.lowerY + POLE_THICKNESS, length / 3, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawDancer(ctx: CanvasRenderingContext2D, dancer: Dancer) {
  const { x, y, state } = dancer

  ctx.save()
  ctx.translate(x, y)

  if (state === 'caught') {
    ctx.fillStyle = 'rgba(255,0,0,0.3)'
    ctx.fillRect(-DANCER_WIDTH / 2 - 5, -DANCER_HEIGHT - 5, DANCER_WIDTH + 10, DANCER_HEIGHT + 10)
  }

  ctx.fillStyle = COLORS.dancerBody
  ctx.beginPath()
  ctx.moveTo(0, -DANCER_HEIGHT)
  ctx.quadraticCurveTo(-DANCER_WIDTH / 2, -DANCER_HEIGHT * 0.8, -DANCER_WIDTH / 2, -DANCER_HEIGHT * 0.4)
  ctx.lineTo(-DANCER_WIDTH / 3, -DANCER_HEIGHT * 0.2)
  ctx.lineTo(-DANCER_WIDTH / 4, 0)
  ctx.lineTo(DANCER_WIDTH / 4, 0)
  ctx.lineTo(DANCER_WIDTH / 3, -DANCER_HEIGHT * 0.2)
  ctx.lineTo(DANCER_WIDTH / 2, -DANCER_HEIGHT * 0.4)
  ctx.quadraticCurveTo(DANCER_WIDTH / 2, -DANCER_HEIGHT * 0.8, 0, -DANCER_HEIGHT)
  ctx.fill()

  ctx.fillStyle = COLORS.dancerAccent
  ctx.beginPath()
  ctx.moveTo(-2, -DANCER_HEIGHT + 5)
  ctx.lineTo(2, -DANCER_HEIGHT + 5)
  ctx.lineTo(3, -DANCER_HEIGHT * 0.6)
  ctx.lineTo(-3, -DANCER_HEIGHT * 0.6)
  ctx.fill()

  ctx.fillStyle = COLORS.dancerSkin
  ctx.beginPath()
  ctx.arc(0, -DANCER_HEIGHT - 5, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#1a1a2e'
  ctx.beginPath()
  ctx.arc(-3, -DANCER_HEIGHT - 6, 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(3, -DANCER_HEIGHT - 6, 1.5, 0, Math.PI * 2)
  ctx.fill()

  if (state === 'jumping') {
    ctx.strokeStyle = COLORS.dancerSkin
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-DANCER_WIDTH / 3, -DANCER_HEIGHT * 0.6)
    ctx.lineTo(-DANCER_WIDTH / 2 - 8, -DANCER_HEIGHT * 0.8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(DANCER_WIDTH / 3, -DANCER_HEIGHT * 0.6)
    ctx.lineTo(DANCER_WIDTH / 2 + 8, -DANCER_HEIGHT * 0.8)
    ctx.stroke()
  }

  ctx.restore()
}

export function drawOperator(ctx: CanvasRenderingContext2D, op: Operator) {
  ctx.save()
  ctx.translate(op.x, op.y)

  const bodyColor = op.side === 'left' ? COLORS.operatorClothes1 : COLORS.operatorClothes2

  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.ellipse(0, -20, 14, 22, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.ellipse(-5, 5, 6, 12, 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(5, 5, 6, 12, -0.1, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = COLORS.operatorSkin
  ctx.beginPath()
  ctx.arc(0, -48, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = COLORS.operatorSkin
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  const armDir = op.side === 'left' ? 1 : -1
  const armY = op.armAngle * 30
  ctx.beginPath()
  ctx.moveTo(armDir * 10, -30)
  ctx.lineTo(armDir * 25, -25 + armY)
  ctx.stroke()

  ctx.fillStyle = '#1a1a2e'
  ctx.beginPath()
  ctx.arc(-3, -50, 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(3, -50, 1.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = bodyColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, -46, 5, 0.2, Math.PI - 0.2)
  ctx.stroke()

  ctx.restore()
}

export function drawOperators(ctx: CanvasRenderingContext2D, operators: Operator[]) {
  for (const op of operators) {
    drawOperator(ctx, op)
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = p.life / p.maxLife
    ctx.fillStyle = p.color

    if (p.type === 'leaf') {
      ctx.translate(p.x, p.y)
      ctx.rotate((p.life * Math.PI * 4) % (Math.PI * 2))
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size / 3, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.type === 'spark') {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

export function drawBeatFlash(ctx: CanvasRenderingContext2D, flashes: BeatFlash[]) {
  for (const f of flashes) {
    ctx.save()
    ctx.globalAlpha = f.alpha
    const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius)
    gradient.addColorStop(0, COLORS.beatGlow)
    gradient.addColorStop(1, 'rgba(243,156,18,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function drawRhythmIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bpm: number,
  beatProgress: number,
  isBeat: boolean
) {
  ctx.save()
  ctx.translate(x, y)

  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.roundRect(-60, -20, 120, 40, 10)
  ctx.fill()

  ctx.fillStyle = COLORS.textGold
  ctx.font = 'bold 14px "Noto Sans SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${bpm} BPM`, 0, -3)

  const barWidth = 80
  const barHeight = 4
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath()
  ctx.roundRect(-barWidth / 2, 8, barWidth, barHeight, 2)
  ctx.fill()

  const progressWidth = barWidth * beatProgress
  ctx.fillStyle = isBeat ? COLORS.beatGlow : COLORS.bambooLight
  ctx.beginPath()
  ctx.roundRect(-barWidth / 2, 8, progressWidth, barHeight, 2)
  ctx.fill()

  if (isBeat) {
    ctx.beginPath()
    ctx.arc(0, -3, 25, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(243,156,18,0.4)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.restore()
}
