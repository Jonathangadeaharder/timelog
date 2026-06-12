const pad = (n: number): string => String(n).padStart(2, '0')

export function fmtSeconds(totalSeconds: number): string {
	const h = Math.floor(totalSeconds / 3600)
	const m = Math.floor((totalSeconds % 3600) / 60)
	const s = totalSeconds % 60
	return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function fmtHm(totalSeconds: number): string {
	const m = Math.floor(totalSeconds / 60)
	const s = totalSeconds % 60
	return `${pad(m)}:${pad(s)}`
}

export function fmtIso(date: Date): string {
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
