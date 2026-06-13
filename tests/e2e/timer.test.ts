import { expect, test } from '@playwright/test'

test.describe('Timer flow', () => {
	test('loads home page and shows morning prompt when idle', async ({ page }) => {
		await page.goto('/')
		await expect(page.locator('h2').filter({ hasText: 'Was machst du?' })).toBeVisible({
			timeout: 10000
		})
	})

	test('navigates to heute page', async ({ page }) => {
		await page.goto('/today')
		await expect(page.locator('p.eyebrow').filter({ hasText: 'Heute' })).toBeVisible({
			timeout: 10000
		})
	})

	test('navigates to woche page', async ({ page }) => {
		await page.goto('/week')
		await expect(page.locator('p.eyebrow').filter({ hasText: 'Woche' })).toBeVisible({
			timeout: 10000
		})
	})

	test('navigates to projekte page', async ({ page }) => {
		await page.goto('/projects')
		await expect(page.locator('p.eyebrow').filter({ hasText: 'Projekte' })).toBeVisible({
			timeout: 10000
		})
	})

	test('navigates to settings page', async ({ page }) => {
		await page.goto('/settings')
		await expect(page.locator('p.eyebrow').filter({ hasText: 'Einstellungen' })).toBeVisible({
			timeout: 10000
		})
	})

	test('navigates to import page', async ({ page }) => {
		await page.goto('/import')
		await expect(page.locator('p.eyebrow').filter({ hasText: 'Import' })).toBeVisible({
			timeout: 10000
		})
	})

	test('sidebar navigation works', async ({ page }) => {
		await page.goto('/today')
		await page.locator('aside a[href="/projects"]').click()
		await expect(page).toHaveURL('/projects')
		await page.locator('aside a[href="/settings"]').click()
		await expect(page).toHaveURL('/settings')
	})
})
