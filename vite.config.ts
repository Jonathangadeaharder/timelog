import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'

const isTest = process.env.VITEST === 'true'

export default defineConfig({
	plugins: [sveltekit()],
	...(isTest && {
		resolve: {
			conditions: ['browser']
		}
	}),
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['tests/unit/**/*.{test,spec}.{js,ts}', 'tests/integration/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			include: ['src/lib/**/*.{svelte,ts}'],
			exclude: ['src/**/*.test.{ts,js}', 'src/**/*.spec.{ts,js}', 'src/app.html', 'src/app.d.ts'],
			thresholds: {
				lines: 50,
				branches: 50,
				functions: 50,
				statements: 50
			}
		}
	},
	server: {
		port: 5173,
		strictPort: false
	}
})
