export function rmsEnergy(samples: Float32Array): number {
	if (samples.length === 0) return 0

	let sum = 0
	for (let i = 0; i < samples.length; i++) {
		const v = samples[i]!
		sum += v * v
	}
	return Math.sqrt(sum / samples.length)
}

export interface MicEngineOptions {
	silenceThreshold?: number
	speechEnergy?: number
	checkinInterval?: number
}

export class MicEngine {
	isSpeaking = $state(false)
	silenceStart: number | null = $state(null as number | null)
	lastSpeechTime: number | null = $state(null as number | null)
	isActive = $state(false)
	lastCheckinTime: number = $state(Date.now())

	stream: MediaStream | null = null
	audioContext: AudioContext | null = null
	analyser: AnalyserNode | null = null

	private animationFrameId: number | null = null
	silenceThreshold: number
	private speechEnergy: number
	private checkinInterval: number
	private silenceNotified = false

	onSilence: (() => void) | null = null
	onCheckin: (() => void) | null = null

	constructor(options: MicEngineOptions = {}) {
		this.silenceThreshold = options.silenceThreshold ?? 3000
		this.speechEnergy = options.speechEnergy ?? 0.01
		this.checkinInterval = options.checkinInterval ?? 30 * 60 * 1000
	}

	async start(): Promise<void> {
		this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
		this.audioContext = new AudioContext()
		this.analyser = this.audioContext.createAnalyser()
		this.analyser.fftSize = 2048

		const source = this.audioContext.createMediaStreamSource(this.stream)
		source.connect(this.analyser)

		this.isActive = true
		this.lastCheckinTime = Date.now()
		this.lastSpeechTime = null
		this.silenceStart = Date.now()
		this.silenceNotified = false

		this.poll()
	}

	private poll = (): void => {
		if (!this.analyser || !this.isActive) return

		const bufferLength = this.analyser.fftSize
		const dataArray = new Float32Array(bufferLength)
		this.analyser.getFloatTimeDomainData(dataArray)

		const energy = rmsEnergy(dataArray)

		if (energy > this.speechEnergy) {
			this.isSpeaking = true
			this.lastSpeechTime = Date.now()
			this.silenceStart = null
			this.silenceNotified = false
		} else {
			this.isSpeaking = false
			if (this.silenceStart === null) {
				this.silenceStart = Date.now()
			}
		}

		// Check silence threshold
		if (this.silenceStart !== null && !this.silenceNotified) {
			const elapsed = Date.now() - this.silenceStart
			if (elapsed >= this.silenceThreshold) {
				this.onSilence?.()
				this.silenceNotified = true
			}
		}

		// Check checkin interval
		const checkinElapsed = Date.now() - this.lastCheckinTime
		if (checkinElapsed >= this.checkinInterval) {
			this.onCheckin?.()
			this.lastCheckinTime = Date.now()
		}

		this.animationFrameId = requestAnimationFrame(this.poll)
	}

	stop(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = null
		}

		if (this.stream) {
			for (const track of this.stream.getTracks()) {
				track.stop()
			}
			this.stream = null
		}

		if (this.audioContext) {
			this.audioContext.close()
			this.audioContext = null
		}

		this.analyser = null
		this.isActive = false
		this.isSpeaking = false
		this.silenceStart = null
	}
}
