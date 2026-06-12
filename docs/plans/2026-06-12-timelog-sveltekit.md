# Timelog SvelteKit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild timelog as a SvelteKit web app with mic-based time tracking, replacing the Python CLI daemon.

**Architecture:** SvelteKit + PGlite/Drizzle for persistence, Web Audio API for mic speech detection, Notification API for silence/check-in prompts. Sidebar+Content shell inspired by Lectern's design system.

**Tech Stack:** SvelteKit, Svelte 5 Runes, PGlite, Drizzle ORM, Tailwind CSS, Geist/Geist-Mono fonts, pnpm, biome, vitest, playwright

---

## File Structure

```
src/
  app.css
  lib/
    styles/tokens.css
    server/db/
      index.ts
      schema.ts
      migrate.ts
    client/
      mic.svelte.ts
      timer.svelte.ts
      notifications.ts
      AppShell.svelte
      Sidebar.svelte
      TopBar.svelte
      TimerDisplay.svelte
      MicBadge.svelte
      SilenceDialog.svelte
      CheckinDialog.svelte
      MorningPrompt.svelte
      EntryRow.svelte
    shared/
      format.ts
      wellness.ts
  routes/
    +layout.svelte
    +page.svelte
    +page.server.ts
    today/+page.svelte, +page.server.ts
    week/+page.svelte, +page.server.ts
    projects/+page.svelte, +page.server.ts
    settings/+page.svelte, +page.server.ts
    import/+page.svelte, +page.server.ts
tests/
  unit/format.test.ts, rms.test.ts, wellness.test.ts
  integration/entries.test.ts
  e2e/timer.test.ts
```

---

### Task 1: Project Scaffolding

**Files:** Create `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `postcss.config.js`, `biome.json`

- [ ] **Step 1:** Run `pnpm create svelte@latest . --template minimal --types ts` in the timelog dir
- [ ] **Step 2:** Install deps: `pnpm add @electric-sql/pglite drizzle-orm lucide-svelte zod @fontsource-variable/geist @fontsource-variable/geist-mono` and dev deps: `pnpm add -D @sveltejs/adapter-node @biomejs/biome tailwindcss postcss autoprefixer drizzle-kit @playwright/test vitest @vitest/coverage-v8 jsdom tsx`
- [ ] **Step 3:** Write `svelte.config.js` with adapter-node, runes: true, $lib alias (copy from Lectern)
- [ ] **Step 4:** Write `vite.config.ts` with sveltekit plugin and test include for `tests/unit/**`
- [ ] **Step 5:** Write `postcss.config.js` with tailwindcss + autoprefixer
- [ ] **Step 6:** Write `biome.json` with tab indent, as-needed semicolons, recommended rules
- [ ] **Step 7:** Add all scripts to package.json (dev, build, check, lint, format, test, test:e2e, db:generate, db:migrate) + set `"packageManager": "pnpm@10.33.2"`
- [ ] **Step 8:** Run `pnpm install && pnpm check` — verify no errors
- [ ] **Step 9:** Commit: `chore: scaffold sveltekit project`

---

### Task 2: Design Tokens + Tailwind Config

**Files:** Create `src/lib/styles/tokens.css`, `src/app.css`, `tailwind.config.ts`

- [ ] **Step 1:** Copy `src/lib/styles/tokens.css` from Lectern (`Documents/projects/lectern/src/lib/styles/tokens.css`) — contains dark/light HSL vars, accent variants, typography, motion tokens
- [ ] **Step 2:** Write `src/app.css` — imports Geist fonts, tokens, Tailwind directives, base styles (same as Lectern's app.css pattern)
- [ ] **Step 3:** Copy `tailwind.config.ts` from Lectern — same HSL color mappings, spacing, radius, transitions
- [ ] **Step 4:** Run `pnpm dev`, verify page renders with dark background and Geist font
- [ ] **Step 5:** Commit: `feat: design tokens, tailwind, app.css`

---

### Task 3: Shared Utilities

**Files:** Create `src/lib/shared/format.ts`, `src/lib/shared/wellness.ts`, `src/lib/client/mic.svelte.ts`, `tests/unit/format.test.ts`, `tests/unit/rms.test.ts`, `tests/unit/wellness.test.ts`

- [ ] **Step 1:** Write `tests/unit/format.test.ts` — test fmtSeconds(0)="00:00:00", fmtSeconds(65)="00:01:05", fmtSeconds(3661)="01:01:01", fmtHm(65)="00:01", fmtIso extracts HH:MM
- [ ] **Step 2:** Run test, verify fail
- [ ] **Step 3:** Write `src/lib/shared/format.ts` with fmtSeconds, fmtHm, fmtIso
- [ ] **Step 4:** Run test, verify pass
- [ ] **Step 5:** Write `tests/unit/rms.test.ts` — test rmsEnergy returns 0 for silence, >0 for noise
- [ ] **Step 6:** Write `src/lib/client/mic.svelte.ts` with exported rmsEnergy function
- [ ] **Step 7:** Run test, verify pass
- [ ] **Step 8:** Write `tests/unit/wellness.test.ts` — test pickWellness returns non-empty string
- [ ] **Step 9:** Write `src/lib/shared/wellness.ts` with 8 wellness tips and pickWellness picker
- [ ] **Step 10:** Run all unit tests, verify pass
- [ ] **Step 11:** Commit: `feat: shared utilities - format, rms, wellness`

---

### Task 4: Database Schema + PGlite

**Files:** Create `src/lib/server/db/schema.ts`, `src/lib/server/db/index.ts`, `src/lib/server/db/migrate.ts`, `drizzle.config.ts`, `tests/integration/entries.test.ts`

- [ ] **Step 1:** Write `tests/integration/entries.test.ts` — PGlite in-memory, create tables, test insert project, insert entry with null end, insert/read settings
- [ ] **Step 2:** Run test, verify fail
- [ ] **Step 3:** Write `src/lib/server/db/schema.ts` — pgTable definitions for projects (id serial, name text unique, color text), entries (id serial, projectId int FK, task text, start timestamp, end timestamp nullable, seconds int), settings (key text PK, value text)
- [ ] **Step 4:** Write `src/lib/server/db/index.ts` — async getDb() singleton using PGlite('./data/timelog') + drizzle(), closeDb()
- [ ] **Step 5:** Write `src/lib/server/db/migrate.ts` — import migrate from drizzle-orm/pglite/migrator, run against ./drizzle folder
- [ ] **Step 6:** Write `drizzle.config.ts` — dialect postgresql, schema path, out ./drizzle
- [ ] **Step 7:** Run `pnpm db:generate` to generate migration SQL
- [ ] **Step 8:** Run test, verify pass
- [ ] **Step 9:** Commit: `feat: database schema, PGlite, Drizzle setup`

---

### Task 5: Mic Engine (Full)

**Files:** Modify `src/lib/client/mic.svelte.ts`

- [ ] **Step 1:** Add MicEngine class with $state: isSpeaking, silenceStart, lastSpeechTime, isActive, stream, audioContext, analyser
- [ ] **Step 2:** Add start() method: request getUserMedia, create AudioContext + AnalyserNode, start polling loop with requestAnimationFrame
- [ ] **Step 3:** Add polling: read Float32Array from analyser, compute rmsEnergy, update isSpeaking/silenceStart/lastSpeechTime
- [ ] **Step 4:** Add stop() method: close stream, disconnect nodes, set isActive=false
- [ ] **Step 5:** Add $effect that watches silenceStart and triggers onSilence callback when threshold exceeded
- [ ] **Step 6:** Write unit test for the state transitions (mock AudioContext)
- [ ] **Step 7:** Commit: `feat: mic engine with Web Audio API`

---

### Task 6: Timer State Machine

**Files:** Create `src/lib/client/timer.svelte.ts`

- [ ] **Step 1:** Write TimerService class with $state: currentProject, currentTask, startTime, isRunning, elapsedSeconds
- [ ] **Step 2:** Add start(projectId, task) — set state, begin interval to update elapsedSeconds every second
- [ ] **Step 3:** Add stop() — compute seconds, POST to /entries via form action, clear state
- [ ] **Step 4:** Add switch(projectId, task) — stop current, start new
- [ ] **Step 5:** Add $effect syncing timer state to localStorage for page reload recovery
- [ ] **Step 6:** Write unit tests for start/stop/switch state transitions
- [ ] **Step 7:** Commit: `feat: timer state machine`

---

### Task 7: Notifications

**Files:** Create `src/lib/client/notifications.ts`

- [ ] **Step 1:** Write requestPermission() wrapper for Notification.requestPermission()
- [ ] **Step 2:** Write notify(title, body, onClick) — creates Notification, sets onclick to window.focus()
- [ ] **Step 3:** Write unit test with mocked Notification global
- [ ] **Step 4:** Commit: `feat: notification helper`

---

### Task 8: App Shell (Sidebar + Content)

**Files:** Create `src/lib/client/AppShell.svelte`, `src/lib/client/Sidebar.svelte`, `src/lib/client/TopBar.svelte`, `src/routes/+layout.svelte`

- [ ] **Step 1:** Write Sidebar.svelte — nav items (Timer, Heute, Woche, Projekte, Settings) with lucide icons, live timer display in header, mic status badge
- [ ] **Step 2:** Write TopBar.svelte — breadcrumb from current route, theme toggle button
- [ ] **Step 3:** Write AppShell.svelte — grid layout: sidebar 224px + content 1fr (same as Lectern), renders children in content area
- [ ] **Step 4:** Write +layout.svelte — imports app.css, wraps children in AppShell, initializes mic engine if timer is running
- [ ] **Step 5:** Run `pnpm check`, verify no type errors
- [ ] **Step 6:** Commit: `feat: app shell with sidebar and topbar`

---

### Task 9: Timer View (Home)

**Files:** Create `src/routes/+page.svelte`, `src/routes/+page.server.ts`, `src/lib/client/TimerDisplay.svelte`, `src/lib/client/MicBadge.svelte`, `src/lib/client/MorningPrompt.svelte`, `src/lib/client/SilenceDialog.svelte`

- [ ] **Step 1:** Write +page.server.ts — load active timer entry, today's entries, projects list
- [ ] **Step 2:** Write TimerDisplay.svelte — big mono HH:MM:SS, project name with color dot
- [ ] **Step 3:** Write MicBadge.svelte — shows "🎤 Speech" or "🔇 X:XX until prompt"
- [ ] **Step 4:** Write MorningPrompt.svelte — modal dialog "What are you working on?" with project selector + task input
- [ ] **Step 5:** Write SilenceDialog.svelte — modal "No speech for X min" with Weiter/Wechseln/Stop buttons
- [ ] **Step 6:** Wire +page.svelte — show MorningPrompt if no active timer, otherwise TimerDisplay + MicBadge + silence check logic. After 18:00 show wrap-up prompt if timer is running: "Feierabend — Timer stoppen?"
- [ ] **Step 7:** Add form actions for start, stop, switch timer
- [ ] **Step 8:** Run `pnpm check`, verify
- [ ] **Step 9:** Commit: `feat: timer view with morning prompt and silence dialog`

---

### Task 10: Heute View

**Files:** Create `src/routes/today/+page.svelte`, `src/routes/today/+page.server.ts`, `src/lib/client/EntryRow.svelte`

- [ ] **Step 1:** Write +page.server.ts — load today's entries with project joins, aggregate totals by project
- [ ] **Step 2:** Write EntryRow.svelte — project name, task, start→end time, duration bar
- [ ] **Step 3:** Write +page.svelte — hero stats (total hours, entry count), chronological entry list, project breakdown with bars
- [ ] **Step 4:** Run `pnpm check`, verify
- [ ] **Step 5:** Commit: `feat: heute view`

---

### Task 11: Woche View

**Files:** Create `src/routes/week/+page.svelte`, `src/routes/week/+page.server.ts`

- [ ] **Step 1:** Write +page.server.ts — load this week's entries, aggregate by day and project
- [ ] **Step 2:** Write +page.svelte — 7-column heatmap grid (like Lectern), daily hour bars, project totals table
- [ ] **Step 3:** Run `pnpm check`, verify
- [ ] **Step 4:** Commit: `feat: woche view`

---

### Task 12: Projekte View

**Files:** Create `src/routes/projects/+page.svelte`, `src/routes/projects/+page.server.ts`

- [ ] **Step 1:** Write +page.server.ts — load all projects with total hours, last activity timestamp; form action for create
- [ ] **Step 2:** Write +page.svelte — project cards (color dot, name, total hours, last active), create form (name + color picker)
- [ ] **Step 3:** Run `pnpm check`, verify
- [ ] **Step 4:** Commit: `feat: projekte view`

---

### Task 13: Settings View

**Files:** Create `src/routes/settings/+page.svelte`, `src/routes/settings/+page.server.ts`

- [ ] **Step 1:** Write +page.server.ts — load settings from DB; form action to save
- [ ] **Step 2:** Write +page.svelte — sliders for silenceThreshold (60-900s), checkinInterval (300-3600s), speechEnergy (200-2000), theme toggle, accent color picker
- [ ] **Step 3:** Run `pnpm check`, verify
- [ ] **Step 4:** Commit: `feat: settings view`

---

### Task 14: Check-in Dialog

**Files:** Create `src/lib/client/CheckinDialog.svelte`

- [ ] **Step 1:** Write CheckinDialog.svelte — shows wellness tip, current task + elapsed, Weiter/Wechseln buttons
- [ ] **Step 2:** Wire into +layout.svelte — trigger from timer service when checkinInterval reached
- [ ] **Step 3:** Commit: `feat: check-in dialog with wellness tips`

---

### Task 15: Data Import

**Files:** Create `src/routes/import/+page.svelte`, `src/routes/import/+page.server.ts`

- [ ] **Step 1:** Write +page.server.ts — form action reads entries.json, parses, inserts into PGlite. Dedup by start timestamp.
- [ ] **Step 2:** Write +page.svelte — file upload form, preview of entries to import, import button
- [ ] **Step 3:** Test with existing entries.json from `~/Library/Application Support/timelog/entries.json`
- [ ] **Step 4:** Commit: `feat: data import from python daemon`

---

### Task 16: E2E Tests

**Files:** Create `tests/e2e/timer.test.ts`, `playwright.config.ts`

- [ ] **Step 1:** Write playwright.config.ts — webServer pointing to `pnpm build && pnpm preview`
- [ ] **Step 2:** Write timer.test.ts — open app, morning prompt appears, start timer, verify timer running, stop timer
- [ ] **Step 3:** Run `pnpm test:e2e`, verify pass
- [ ] **Step 4:** Commit: `feat: e2e tests`

---

### Task 17: Cleanup

- [ ] **Step 1:** Remove old Python files (daemon.py, main.py, pyproject.toml, .venv, uv.lock)
- [ ] **Step 2:** Remove LaunchAgent plist `~/Library/LaunchAgents/com.jonathan.timelog.plist`
- [ ] **Step 3:** Unload LaunchAgent if loaded: `launchctl bootout gui/$(id -u)/com.jonathan.timelog`
- [ ] **Step 4:** Add `.superpowers/` to .gitignore
- [ ] **Step 5:** Run full check: `pnpm lint && pnpm check && pnpm test && pnpm test:e2e`
- [ ] **Step 6:** Commit: `chore: remove python daemon, cleanup`
