import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requestPermission, notify, isNotificationSupported } from '$lib/client/notifications'

describe('notifications', () => {
	let originalNotification: typeof Notification

	beforeEach(() => {
		originalNotification = globalThis.Notification
	})

	afterEach(() => {
		vi.restoreAllMocks()
		globalThis.Notification = originalNotification as typeof Notification
	})

	function mockNotification(permission: NotificationPermission = 'default') {
		const instances: { onclick: ((ev: Event) => void) | null; close: () => void }[] = []

		const MockNotification = vi.fn().mockImplementation((title: string, _options?: NotificationOptions) => {
			const instance = { onclick: null as ((ev: Event) => void) | null, close: vi.fn() }
			instances.push(instance)
			return instance
		}) as unknown as typeof Notification

		Object.defineProperty(MockNotification, 'permission', {
			get: () => permission,
			configurable: true
		})
		MockNotification.requestPermission = vi.fn().mockResolvedValue(permission)

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		globalThis.Notification = MockNotification as any

		return { MockNotification, instances }
	}

	describe('isNotificationSupported', () => {
		it('returns true when Notification exists in window', () => {
			mockNotification('default')
			expect(isNotificationSupported()).toBe(true)
		})

		it('returns false when Notification is not in window', () => {
			// @ts-expect-error removing global
			delete globalThis.Notification
			expect(isNotificationSupported()).toBe(false)
		})
	})

	describe('requestPermission', () => {
		it('returns "denied" when Notification is not supported', async () => {
			// @ts-expect-error removing global
			delete globalThis.Notification
			expect(await requestPermission()).toBe('denied')
		})

		it('returns "granted" immediately when already granted', async () => {
			const { MockNotification } = mockNotification('granted')
			const result = await requestPermission()
			expect(result).toBe('granted')
			expect(MockNotification.requestPermission).not.toHaveBeenCalled()
		})

		it('calls requestPermission() when not yet decided', async () => {
			const { MockNotification } = mockNotification('default')
			const result = await requestPermission()
			expect(result).toBe('default')
			expect(MockNotification.requestPermission).toHaveBeenCalled()
		})
	})

	describe('notify', () => {
		it('returns null when permission is not granted', () => {
			mockNotification('denied')
			const result = notify('Test', 'Body')
			expect(result).toBeNull()
		})

		it('creates Notification and sets onclick when permission is granted', () => {
			const { MockNotification, instances } = mockNotification('granted')

			const onClick = vi.fn()
			const result = notify('Title', 'Body text', onClick)

			expect(MockNotification).toHaveBeenCalledWith('Title', {
				body: 'Body text',
				icon: '/favicon.png'
			})
			expect(result).toBe(instances[0]!)
			expect(instances[0]!.onclick).not.toBeNull()
		})

		it('onclick calls window.focus, callback, and close', () => {
			const { instances } = mockNotification('granted')
			const focusSpy = vi.spyOn(window, 'focus').mockReturnValue(undefined)
			const onClick = vi.fn()

			notify('Title', 'Body', onClick)

			// Simulate the click event
			const clickHandler = instances[0]!.onclick!
			clickHandler.call(instances[0], new Event('click'))

			expect(focusSpy).toHaveBeenCalled()
			expect(onClick).toHaveBeenCalled()
			expect(instances[0]!.close).toHaveBeenCalled()
		})
	})
})
