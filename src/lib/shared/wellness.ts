export const WELLNESS_TIPS: string[] = [
	'Stehen Sie auf und strecken Sie sich — Ihr Rücken dankt es!',
	'Schauen Sie 20 Sekunden auf einen Punkt in der Ferne — Entspannung für die Augen.',
	'Trinken Sie ein Glas Wasser — Ihr Körper braucht Flüssigkeit.',
	'Machen Sie 5 tiefe Atemzüge — das reduziert Stress sofort.',
	'Rollen Sie die Schultern — lösen Sie Verspannungen im Nacken.',
	'Schließen Sie die Augen für 10 Sekunden — geben Sie ihnen eine Pause.',
	'Strecken Sie die Handgelenke aus — Vorbeugung gegen Mausarm.',
	'Stehen Sie auf und gehen Sie kurz umher — Bewegung fördert die Konzentration.'
]

export function pickWellness(): string {
	return WELLNESS_TIPS[Math.floor(Math.random() * WELLNESS_TIPS.length)]!
}
