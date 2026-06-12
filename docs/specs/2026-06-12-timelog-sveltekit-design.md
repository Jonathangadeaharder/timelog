# Timelog SvelteKit — Design Spec

## Overview

Timelog als SvelteKit Web-App neu bauen. Ersetzt den Python-CLI-Daemon. Gleiche Funktionalität — Mikrofon-basierte Zeiterfassung — aber als Browser-App mit Web Audio API statt PyAudio.

## Architecture

### Stack
- SvelteKit, `adapter-node`, Svelte 5 Runes
- Tailwind CSS + Lectern-Design-Tokens (Geist/Geist-Mono, HSL-Variablen, Dark/Light)
- PGlite + Drizzle ORM für Datenhaltung
- Web Audio API für Mikrofon-Spracherkennung (RMS-Energy)
- Notification API für macOS Notifications
- pnpm, biome, vitest, playwright (per AGENTS.md)

### Shell Layout
Sidebar + Content (wie Lectern). Sidebar-Header zeigt Live-Timer + Mic-Status. Nav-Items: Timer, Heute, Woche, Projekte, Settings.

## Database Schema (Drizzle + PGlite)

### `entries`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| project_id | integer FK → projects | |
| task | text | optional task description |
| start | timestamp | |
| end | timestamp | nullable — null = running |
| seconds | integer | computed on stop |

### `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | text unique | |
| color | text | HSL accent color for project |

### `settings`
| Column | Type | Notes |
|--------|------|-------|
| key | text PK | |
| value | text | JSON-serialized |

Default settings:
- `silenceThreshold`: `300` (5 min)
- `checkinInterval`: `1800` (30 min)
- `speechEnergy`: `800` (RMS minimum)

## Core Flow

1. **Morning Prompt** — App öffnen → Dialog "Was machst du?" → Timer startet mit ausgewählter Activity
2. **Speech Detected** — Timer läuft, Sidebar zeigt "🎤 Speech" Badge
3. **Silence Threshold (5 min)** — macOS Notification "Was machst du jetzt?" → Klick öffnet App → Dialog: Weiter / Wechseln / Stop
4. **Periodic Check-in (30 min)** — macOS Notification mit Wellness-Tipp + aktuellem Task → Weiter oder Wechseln
5. **After-hours** — Wrap-up Flow: Tageszusammenfassung anzeigen, offene Timer stoppen

## Mic Engine (Client-Side)

- `AudioContext` + `MediaStream` via `navigator.mediaDevices.getUserMedia`
- `AnalyserNode` für RMS-Energy-Berechnung (gleiche Math wie `daemon.py:rms_energy`)
- Svelte 5 `$state` Runes: `isSpeaking`, `silenceStart`, `lastSpeechTime`
- `$effect` überwacht Stille-Dauer → triggert Notification wenn `silenceThreshold` erreicht
- `$effect` überwacht Zeit seit letztem Check-in → triggert Check-in Notification wenn `checkinInterval` erreicht

### RMS Energy Calculation
```js
function rmsEnergy(float32Array) {
  let sum = 0;
  for (let i = 0; i < float32Array.length; i++) {
    sum += float32Array[i] * float32Array[i];
  }
  return Math.sqrt(sum / float32Array.length);
}
```

## Views

### Timer (Home — `/`)
- Aktueller Timer groß (HH:MM:SS, mono, display-Größe)
- Activity-Name + Projekt-Farbe
- Mic-Status-Badges: "🎤 Speech" / "🔇 2:30 until prompt"
- Quick-Actions: Stop, Switch

### Heute (`/today`)
- Alle Entries des Tages chronologisch
- Gesamtstunden oben (wie Lectern hero-stats)
- Project-Breakdown mit Duration-Bars

### Woche (`/week`)
- Wochen-Heatmap (7×5 Grid, wie Lectern Activity-Heatmap)
- Project-Totals pro Tag
- Daily-Bars mit Stundenskala

### Projekte (`/projects`)
- Projekt-Liste mit Total-Stunden, Farbe, letzter Activity
- Neue Projekte anlegen (Name + Farbe)

### Settings (`/settings`)
- Silence-Threshold Slider (1–15 min)
- Checkin-Interval Slider (5–60 min)
- Speech-Energy Slider (200–2000)
- Dark/Light Toggle
- Accent-Farbe (cyan, violet, amber, emerald — wie Lectern)

## Data Flow

- **Client:** Mic-Detection + Timer-State (Svelte Runes in `$lib/client/mic.svelte.ts`)
- **Server:** PGlite CRUD via SvelteKit Loaders (`+page.server.ts`) + Form-Actions
- **Writes:** `POST /entries` (neuer Eintrag), `POST /timer/stop`, `POST /timer/switch`
- **Timer-Sync:** Client schreibt Timer-State bei Start/Stop/Switch per Form-Action, nicht per Polling

## Notification Strategy

- **App im Vordergrund:** In-App Modal/Toast für Silence-Prompt + Check-in
- **App im Hintergrund:** macOS Notification API (`Notification.requestPermission()`)
- Klick auf Notification → Fokus auf App + Dialog öffnet sich

## Migration from Python

- Bestehende `entries.json` Daten: Einmaliger Import-Script (`/import` Route oder CLI)
- Python-Daemon wird durch SvelteKit App ersetzt
- LaunchAgent `.plist` wird entfernt

## Testing

- Unit: Mic-Energy-Berechnung, Timer-Formatting, Entry-Aggregation (vitest)
- Integration: PGlite CRUD, Form-Actions (vitest + PGlite in-memory)
- E2E: Playwright — Timer starten/stopen, Entries prüfen, Settings ändern
