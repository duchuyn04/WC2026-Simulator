# Repository Guidelines

## Project Overview

WC 2026 Simulator — a client-heavy SPA for simulating the FIFA World Cup 2026. Vietnamese UI throughout. Users predict group scores, drag-and-drop rankings, pick knockout winners, and view live tournament data from FIFA + ESPN APIs.

**Stack**: Next.js 16 (App Router) · React 19 · Zustand · Tailwind CSS v4 · dnd-kit · TypeScript (strict)

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Static Seed Data (data/*.json)                                 │
│  wc2026-seed.json · fifa-teams-squads.json · fifa-rankings.json │
│  third-place-combinations.json · fifa-tournament-stats.json     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Zustand Store (useSimulation) — localStorage persisted         │
│  matchResults · manualOrder · knockoutWinners · favorites       │
│  activeTab · scrollPositions · bracketView · tournamentStats    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  AppShell (tab-based SPA router)                                │
│  ┌─────────┬──────────┬──────────┬──────────┬────────────┐     │
│  │ Groups  │ Schedule │  Live    │  Teams   │ Knockout   │     │
│  │ + Third │ + Favs   │ (ESPN    │ (server  │ (bracket   │     │
│  │ Place   │          │ 15s poll)│  pages)  │ tree)      │     │
│  └─────────┴──────────┴──────────┴──────────┴────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  External APIs                                                  │
│  FIFA API (calendar, squads, player stats)                      │
│  ESPN API (scoreboard, standings, team schedules)               │
│  /api/tournament-stats (server-side aggregator, 60s client poll)│
└─────────────────────────────────────────────────────────────────┘
```

**Key pattern**: Root `page.tsx` is a thin server shell → renders single `<AppShell />` client component → tab-based internal routing (no URL changes). Only `/teams/*` pages are true server components with SSG.

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/app/` | App Router pages + API routes |
| `src/components/ui/` | Primitives: FlagIcon, TeamBadge, PortraitImage, SoccerSkeleton, ScoreInput, MatchInfo |
| `src/components/matches/` | SchedulePanel, LivePanel, MatchStatsModal, H2HModal, match cards |
| `src/components/standings/` | GroupCard, StandingsDnD, TournamentStatsBoard, EspnStandingsBoard, ThirdPlacePanel |
| `src/components/bracket/` | BracketTree (visual knockout), KnockoutBracket, BracketIcons |
| `src/components/teams/` | TeamRoster, TeamStatsBoard, TeamsDirectory, TeamsHeader |
| `src/components/layout/` | AppShell, FloatingBackButton, BackToTeamsButton |
| `src/lib/` | State (store.ts), hooks, ESPN/FIFA integrations, domain logic |
| `src/lib/fifa/` | Core domain: standings, bracket, third-place, rankings, types |
| `data/` | Static JSON seed files (auto-updated by CI) |
| `scripts/` | Data pipelines: FIFA/ESPN fetchers, Wikipedia scrapers |
| `e2e/` | Playwright E2E tests |
| `public/flags/` | Country flag PNGs (80px, from flagcdn.com) |

## Development Commands

```bash
# Dev
npm run dev                    # Next.js dev server (HMR)

# Build
npm run build                  # Production build + SPA fallback (out/)

# Test
npm run test                   # Unit tests (vitest run)
npm run test:e2e               # E2E tests (playwright test)
npm run test:all               # Unit + E2E
npm run test:e2e:ui            # Playwright interactive UI
npm run test:tester            # Tester-script E2E spec only

# Lint
npm run lint                   # ESLint (flat config)

# Data pipelines
npm run fetch:teams-squads     # Fetch FIFA team squads → data/fifa-teams-squads.json
npm run fetch:rankings         # Fetch FIFA rankings → data/fifa-rankings.json
npm run fetch:tournament-stats # Fetch tournament stats → data/fifa-tournament-stats.json
npm run download:flags         # Download flag PNGs → public/flags/
```

## Code Conventions & Common Patterns

### Component Patterns
- **All interactive components** use `"use client"` directive at top of file
- **Server components**: only `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/teams/page.tsx`, `src/app/teams/[slug]/page.tsx`
- **Imports**: Use `@/` path alias (maps to `src/`), never relative `../` across directories
- **Component exports**: Named exports (`export function Foo()`), default exports only for dynamic imports and SoccerSkeleton

### State Management
- **Zustand store** (`src/lib/store.ts`): single `useSimulation` store persisted to localStorage
- **Derived state**: Computed via hooks in `src/lib/hooks.ts` (useGroupStandings, useThirdPlace, useKnockout, useSchedule)
- **Store pattern**: `useSimulation((s) => s.field)` selector pattern throughout

### Data Fetching
- **Static JSON**: Imported directly in server components or loaded client-side
- **Live data**: `useEspnLiveScores` (15s poll), `useLiveSync` (60s poll + visibility change)
- **API route**: `/api/tournament-stats` aggregates FIFA+ESPN server-side with concurrency limiter (4 workers)
- **GitHub Pages fallback**: `src/lib/tournament-stats-fetch.ts` provides browser-side FIFA fetching when API routes unavailable

### Styling
- **Tailwind CSS v4** via PostCSS (`@tailwindcss/postcss`)
- **Dark theme**: `bg-[#0c0f14]`, zinc/amber/rose color palette
- **Responsive**: Mobile-first, `sm:` breakpoint for larger screens
- **Vietnamese text**: All UI labels in Vietnamese

### Naming Conventions
- **Files**: PascalCase for components (`GroupCard.tsx`), kebab-case for utilities (`use-live-sync.ts`)
- **Types**: Defined in `src/lib/fifa/types.ts` for domain, co-located for component-specific types
- **Hooks**: `use` prefix, kebab-case file (`use-espn-live-scores.ts`)

## Important Files

| File | Role |
|------|------|
| `src/app/page.tsx` | Entry point — renders AppShell |
| `src/components/layout/AppShell.tsx` | Main SPA shell — tab routing, all feature panels |
| `src/lib/store.ts` | Zustand store — all simulation state |
| `src/lib/hooks.ts` | Derived state hooks (standings, third-place, knockout, schedule) |
| `src/lib/data.ts` | Seed data loader (wc2026-seed.json) |
| `src/lib/fifa/standings.ts` | FIFA tiebreaker algorithm (points→GD→GF→H2H→fair play→ranking) |
| `src/lib/fifa/bracket.ts` | Knockout bracket resolver |
| `src/lib/fifa/third-place.ts` | Third-place ranking + Annex C combinations |
| `src/lib/espn-match.ts` | ESPN scoreboard parser + live match utilities |
| `next.config.ts` | Dual-mode: local dev vs GitHub Pages static export |
| `tsconfig.json` | Strict TS, `@/*` → `src/*` path alias |

## Runtime/Tooling Preferences

- **Node.js 22** (CI uses Node 22)
- **npm** (package-lock.json present)
- **No Bun required** despite bun.lock in parent directory
- **Next.js 16.2.7** with Turbopack
- **TypeScript strict mode** — all `strict` checks enabled
- **GitHub Pages deployment** — static export with `GITHUB_PAGES=true` env

## Testing & QA

### Unit Tests (Vitest)
```bash
npm run test                   # Run all unit tests
npx vitest run src/lib/fifa/   # Run specific directory
npx vitest run --watch         # Watch mode
```
- **Config**: `vitest.config.ts` — node environment, 30s timeout, forks pool
- **Setup**: `vitest.setup.ts` — @testing-library/jest-dom matchers, in-memory localStorage mock
- **Location**: `src/components/__tests__/`, `src/lib/__tests__/`, `src/lib/fifa/__tests__/`
- **Patterns**: `vi.mock()` for modules, `renderHook` for hooks, `ReactDOMServer.renderToString` for SSR components

### E2E Tests (Playwright)
```bash
npm run test:e2e               # Full suite
npm run test:e2e:ui            # Interactive UI
npx playwright test e2e/groups.spec.ts  # Single spec
```
- **Config**: `playwright.config.ts` — baseURL localhost:3000, auto-starts dev server, trace on retry
- **Helpers**: `e2e/helpers.ts` — clearSimulationStorage, gotoFresh, goToTab, dndKitDrag, assertNoHorizontalOverflow
- **Tester POM**: `e2e/tester/pages.ts` — Vietnamese Page Object Model (TrangVongBang, TrangHangBa)
- **API mocking**: `page.route()` for ESPN API interception in live-panel tests

### CI/CD
- **Deploy**: Push to `main` → build → publish to `gh-pages` branch
- **Auto-update**: FIFA squads (daily), tournament stats (every 15 min) → commit → trigger deploy
