import { app, Menu, nativeImage, Tray } from 'electron'

let tray: Tray | null = null

export function createTray(showWindow: () => void): void {
	const icon = nativeImage.createFromDataURL(
		'data:image/svg+xml;base64,' +
			Buffer.from(
				'<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#4da6ff" stroke="#fff" stroke-width="1"/></svg>'
			).toString('base64')
	)

	tray = new Tray(icon)
	tray.setToolTip('Timelog')

	const contextMenu = Menu.buildFromTemplate([
		{
			label: 'Show Timelog',
			click: () => {
				showWindow()
			}
		},
		{ type: 'separator' },
		{
			label: 'Quit',
			click: () => {
				app.quit()
			}
		}
	])

	tray.setContextMenu(contextMenu)

	tray.on('click', () => {
		showWindow()
	})
}
