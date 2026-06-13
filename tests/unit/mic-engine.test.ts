import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MicEngine, rmsEnergy } from '$lib/client/mic.svelte'

/**
 * Unit tests for MicEngine with mocked Web Audio API.
 * We mock navigator.mediaDevices.getUserMedia, AudioContext, AnalyserNode,
 * and requestAnimationFrame to control the polling loop precisely.
 *
 * We do NOT mock Date globally — that breaks Svelte's internal scheduler.
 * Instead, the MicEngine uses Date.now() directly, and we test state
 * transitions driven by the analyser input values. Time-based threshold
 * tests use vi.useFakeTimers() with careful cleanup.
 */

// --- Mocks ---

const mockTrack = { stop: vi.fn() }
const mockStream = { getTracks: () => [mockTrack] }

const mockAnalyserNode = {
	fftSize: 2048,
	getFloatTimeDomainData: vi.fn(),
	connect: vi.fn()
}

const mockSource = { connect: vi.fn() }

const mockAudioContext = {
	createAnalyser: vi.fn(() => mockAnalyserNode),
	createMediaStreamSource: vi.fn(() => mockSource),
	close: vi.fn()
}

const rafCallbacks: Map<number, FrameRequestCallback> = new Map()
let rafIdCounter = 0

beforeEach(() => {
	vi.stubGlobal(
		'navigator',
		Object.assign({}, navigator, {
			mediaDevices: {
				getUserMedia: vi.fn(async () => mockStream)
			}
		})
	)

	vi.stubGlobal(
		'AudioContext',
		vi.fn(() => mockAudioContext)
	)

	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
		const id = ++rafIdCounter
		rafCallbacks.set(id, cb)
		return id
	})

	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		rafCallbacks.delete(id)
	})

	rafCallbacks.clear()
	rafIdCounter = 0
	vi.clearAllMocks()
})

afterEach(() => {
	vi.restoreAllMocks()
})

/** Simulate a single animation frame tick — processes ONE callback */
function tickRaf(): void {
	// Take a snapshot of current callbacks to avoid infinite loop
	const entries = [...rafCallbacks.entries()]
	rafCallbacks.clear()
	for (const [, cb] of entries) {
		cb(performance.now())
	}
}

/** Fill the analyser buffer with a constant value */
function fillAnalyser(value: number): void {
	mockAnalyserNode.getFloatTimeDomainData.mockImplementation((arr: Float32Array) => {
		arr.fill(value)
	})
}

// --- Tests ---

describe('MicEngine', () => {
	it('requests mic access and sets up audio pipeline on start', async () => {
		const engine = new MicEngine()
		await engine.start()

		expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
		expect(mockAudioContext.createAnalyser).toHaveBeenCalled()
		expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream)
		expect(mockSource.connect).toHaveBeenCalledWith(mockAnalyserNode)
		expect(engine.isActive).toBe(true)
		expect(engine.analyser).toBe(mockAnalyserNode)

		engine.stop()
	})

	it('detects speech when energy exceeds threshold', async () => {
		const engine = new MicEngine({ speechEnergy: 0.01 })
		await engine.start()

		// Simulate high energy (0.5 amplitude → rms ≈ 0.5 > 0.01)
		fillAnalyser(0.5)
		tickRaf()

		expect(engine.isSpeaking).toBe(true)
		expect(engine.lastSpeechTime).not.toBeNull()
		expect(engine.silenceStart).toBeNull()

		engine.stop()
	})

	it('detects silence when energy is below threshold', async () => {
		const engine = new MicEngine({ speechEnergy: 0.01 })
		await engine.start()

		// Simulate silence
		fillAnalyser(0)
		tickRaf()

		expect(engine.isSpeaking).toBe(false)
		expect(engine.silenceStart).not.toBeNull()

		engine.stop()
	})

	it('transitions from speech to silence', async () => {
		const engine = new MicEngine({ speechEnergy: 0.01 })
		await engine.start()

		// First: speech
		fillAnalyser(0.5)
		tickRaf()
		expect(engine.isSpeaking).toBe(true)
		expect(engine.silenceStart).toBeNull()

		// Then: silence
		fillAnalyser(0)
		tickRaf()
		expect(engine.isSpeaking).toBe(false)
		expect(engine.silenceStart).not.toBeNull()

		engine.stop()
	})

	it('transitions from silence to speech', async () => {
		const engine = new MicEngine({ speechEnergy: 0.01 })
		await engine.start()

		// First: silence
		fillAnalyser(0)
		tickRaf()
		expect(engine.isSpeaking).toBe(false)
		expect(engine.silenceStart).not.toBeNull()

		// Then: speech
		fillAnalyser(0.5)
		tickRaf()
		expect(engine.isSpeaking).toBe(true)
		expect(engine.silenceStart).toBeNull()

		engine.stop()
	})

	it('triggers onSilence callback when silence threshold is exceeded', async () => {
		vi.useFakeTimers()
		const onSilence = vi.fn()
		const engine = new MicEngine({ silenceThreshold: 100, speechEnergy: 0.01 })
		engine.onSilence = onSilence
		await engine.start()

		fillAnalyser(0)

		// First tick sets silenceStart
		tickRaf()
		expect(onSilence).not.toHaveBeenCalled()

		// Advance time past threshold
		vi.advanceTimersByTime(150)
		tickRaf()
		expect(onSilence).toHaveBeenCalledTimes(1)

		engine.stop()
		vi.useRealTimers()
	})

	it('does not trigger onSilence twice for the same silence period', async () => {
		vi.useFakeTimers()
		const onSilence = vi.fn()
		const engine = new MicEngine({ silenceThreshold: 100, speechEnergy: 0.01 })
		engine.onSilence = onSilence
		await engine.start()

		fillAnalyser(0)

		// Set silenceStart
		tickRaf()

		// Past threshold — triggers once
		vi.advanceTimersByTime(150)
		tickRaf()
		expect(onSilence).toHaveBeenCalledTimes(1)

		// Still past threshold — should NOT trigger again
		vi.advanceTimersByTime(150)
		tickRaf()
		expect(onSilence).toHaveBeenCalledTimes(1)

		engine.stop()
		vi.useRealTimers()
	})

	it('resets silence notification after speech resumes', async () => {
		vi.useFakeTimers()
		const onSilence = vi.fn()
		const engine = new MicEngine({ silenceThreshold: 100, speechEnergy: 0.01 })
		engine.onSilence = onSilence
		await engine.start()

		// Silence period 1
		fillAnalyser(0)
		tickRaf()
		vi.advanceTimersByTime(150)
		tickRaf()
		expect(onSilence).toHaveBeenCalledTimes(1)

		// Speech resumes
		fillAnalyser(0.5)
		tickRaf()

		// Silence period 2
		fillAnalyser(0)
		tickRaf()
		vi.advanceTimersByTime(150)
		tickRaf()
		expect(onSilence).toHaveBeenCalledTimes(2)

		engine.stop()
		vi.useRealTimers()
	})

	it('triggers onCheckin callback when checkin interval is exceeded', async () => {
		vi.useFakeTimers()
		const onCheckin = vi.fn()
		const engine = new MicEngine({ checkinInterval: 200, speechEnergy: 0.01 })
		engine.onCheckin = onCheckin
		await engine.start()

		fillAnalyser(0)

		// Not yet
		tickRaf()
		expect(onCheckin).not.toHaveBeenCalled()

		// Past interval
		vi.advanceTimersByTime(250)
		tickRaf()
		expect(onCheckin).toHaveBeenCalledTimes(1)

		engine.stop()
		vi.useRealTimers()
	})

	it('stops cleanly and cleans up resources', async () => {
		const engine = new MicEngine()
		await engine.start()

		engine.stop()

		expect(engine.isActive).toBe(false)
		expect(engine.isSpeaking).toBe(false)
		expect(engine.silenceStart).toBeNull()
		expect(engine.stream).toBeNull()
		expect(engine.audioContext).toBeNull()
		expect(engine.analyser).toBeNull()
		expect(mockTrack.stop).toHaveBeenCalled()
		expect(mockAudioContext.close).toHaveBeenCalled()
	})

	it('does not poll after stop', async () => {
		const engine = new MicEngine({ speechEnergy: 0.01 })
		await engine.start()

		engine.stop()
		rafCallbacks.clear()

		// Tick should not re-register a callback since engine is stopped
		fillAnalyser(0.5)
		tickRaf()
		// After stop, no new RAF should be scheduled
		expect(rafCallbacks.size).toBe(0)
	})

	it('uses default options when none provided', () => {
		const engine = new MicEngine()
		expect(engine.isActive).toBe(false)
		expect(engine.isSpeaking).toBe(false)
		expect(engine.silenceStart).toBeNull()
		expect(engine.lastSpeechTime).toBeNull()
	})
})

describe('rmsEnergy (re-exported)', () => {
	it('is importable from mic.svelte', () => {
		expect(rmsEnergy).toBeTypeOf('function')
	})
})
