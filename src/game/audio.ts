export class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private initialized = false

  init() {
    if (this.initialized) return
    try {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.5
      this.masterGain.connect(this.ctx.destination)
      this.initialized = true
    } catch {
      this.initialized = false
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume()
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
    if (!this.ctx || !this.masterGain || !this.initialized) return
    this.resume()

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(this.ctx.currentTime)
    osc.stop(this.ctx.currentTime + duration)
  }

  private playNoise(duration: number, volume = 0.1) {
    if (!this.ctx || !this.masterGain || !this.initialized) return
    this.resume()

    const bufferSize = this.ctx.sampleRate * duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1))
    }

    const source = this.ctx.createBufferSource()
    source.buffer = buffer

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 3000

    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    source.start()
  }

  playBambooHit() {
    this.playTone(220, 0.08, 'square', 0.15)
    this.playNoise(0.06, 0.08)
  }

  playBambooOpen() {
    this.playTone(330, 0.05, 'sine', 0.08)
  }

  playJump() {
    this.playTone(440, 0.1, 'sine', 0.12)
    this.playTone(550, 0.08, 'sine', 0.08)
  }

  playLand() {
    this.playTone(150, 0.1, 'triangle', 0.1)
    this.playNoise(0.05, 0.06)
  }

  playPerfect() {
    this.playTone(880, 0.15, 'sine', 0.2)
    setTimeout(() => this.playTone(1100, 0.15, 'sine', 0.15), 80)
    setTimeout(() => this.playTone(1320, 0.2, 'sine', 0.1), 160)
  }

  playGreat() {
    this.playTone(660, 0.15, 'sine', 0.15)
    setTimeout(() => this.playTone(880, 0.15, 'sine', 0.1), 80)
  }

  playGood() {
    this.playTone(440, 0.1, 'sine', 0.1)
  }

  playMiss() {
    this.playTone(150, 0.3, 'sawtooth', 0.1)
  }

  playBeat(strong: boolean) {
    if (strong) {
      this.playTone(180, 0.12, 'square', 0.2)
      this.playNoise(0.08, 0.12)
    } else {
      this.playTone(260, 0.06, 'square', 0.12)
      this.playNoise(0.04, 0.06)
    }
  }

  playGameOver() {
    this.playTone(200, 0.3, 'sawtooth', 0.15)
    setTimeout(() => this.playTone(150, 0.4, 'sawtooth', 0.12), 200)
    setTimeout(() => this.playTone(100, 0.5, 'sawtooth', 0.1), 400)
  }

  playCountdown() {
    this.playTone(600, 0.1, 'sine', 0.15)
  }

  playStart() {
    this.playTone(523, 0.1, 'sine', 0.15)
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.15), 100)
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.2), 200)
  }

  setVolume(v: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, v))
    }
  }
}

export const audioEngine = new AudioEngine()
