export function isNotificationSupported(): boolean {
	return 'Notification' in window
}

export async function requestPermission(): Promise<NotificationPermission> {
	if (!isNotificationSupported()) return 'denied'
	if (Notification.permission === 'granted') return 'granted'
	return await Notification.requestPermission()
}

export function notify(
	title: string,
	body: string,
	onClick?: () => void
): Notification | null {
	if (Notification.permission !== 'granted') return null
	const n = new Notification(title, { body, icon: '/favicon.png' })
	n.onclick = () => {
		window.focus()
		onClick?.()
		n.close()
	}
	return n
}
