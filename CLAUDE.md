# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build (static export when GITHUB_PAGES=true)
npm test                 # Run all unit tests (Vitest)
npm run test:unit        # Same as above
npm run test:e2e         # Run all E2E tests (Playwright)
npm run test:e2e:ui      # Playwright UI mode
npm run test:all         # Unit + E2E
npm run lint             # ESLint
npm run fetch:rankings   # Update FIFA rankings from inside.fifa.com
npm run survey:fifa      # Fetch schedule & teams from FIFA API → data/wc2026-seed.json
npm run download:flags   # Download flag images to public/flags/
```

Run a single Vitest test: `npx vitest run src/lib/fifa/__tests__/standings.test.ts`
Run a single Playwright test: `npx playwright test e2e/groups.spec.ts`

## Tech Stack

Next.js 16 (App Router, static export for GitHub Pages), React 19, TypeScript, Zustand (state + persist), Tailwind CSS 4, Vitest, Playwright.

## Architecture Overview

This is a **client-side only** Next.js app that simulates the 2026 FIFA World Cup. It builds to static HTML/JS hosted on GitHub Pages at `https://duchuyn04.github.io/WC2026-Simulator/` (basePath: `/WC2026-Simulator`).

### Directory Map

```
src/
  app/           # Next.js App Router pages + API routes
    page.tsx         # Main simulator → renders <AppShell />
    teams/page.tsx   # Teams directory (48 teams)
    teams/[slug]/    # Team detail (squad, stats, recent matches)
    api/tournament-stats/  # Proxies FIFA + ESPN live stats
    api/worldcup-2026/teams/  # Serves cached squad data
  components/    # 35 React components
  lib/           # All logic: store, FIFA engine, hooks, types
    store.ts         # Zustand store (single source of truth)
    hooks.ts         # React hooks (useGroupStandings, useKnockout, useLiveSync, etc.)
    data.ts          # Seed data loader + flag URL helpers
    compute-standings.ts  # Orchestrates standings calculation
    schedule.ts      # Schedule entries computation
    tabs.ts          # Tab type definitions
    fifa/            # Pure FIFA rules engine
      types.ts          # Domain types (Team, MatchResult, GroupStanding, etc.)
      standings.ts      # Group standings algorithm (H2H tiebreakers)
      third-place.ts    # Third-place ranking + Annex C (495 combinations)
      bracket.ts        # Knockout bracket resolution + sync
      bracket-tree.ts   # Bracket tree structure (left/right halves)
      podium.ts         # Podium results
      engine.ts         # High-level engine wiring
    __tests__/       # Vitest tests for lib logic
    fifa/__tests__/  # Vitest tests for FIFA engine
data/          # Static JSON: wc2026-seed.json, third-place-combinations.json, fifa-rankings.json, fifa-teams-squads.json
e2e/           # Playwright E2E tests (8 spec files + tester/)
scripts/       # Data-fetching Node.js scripts (.mjs)
public/flags/  # Local flag PNGs
```

### Key Architecture Patterns

**Zustand store** (`src/lib/store.ts`) — Single source of truth persisted to localStorage via `zustand/middleware/persist`. Stores: match results, manual rankings, knockout winners, UI state (active tab, scroll positions, bracket zoom). Actions recalculate standings → third-place → knockout automatically.

**Two input modes**: "Scores" (enter match results per group) and "Ranks" (drag-and-drop team ordering via @dnd-kit). Switching modes seeds the other from current data.

**FIFA engine** (`src/lib/fifa/`) — Pure functions implementing FIFA rules: group standings (points → GD → GF → H2H → fair play → FIFA ranking), Annex C third-place combinations (495 permutations mapping 3rd-place teams to knockout slots), knockout bracket resolution with dependent match propagation.

**Knockout auto-sync**: When group/third-place results change, knockout winners are pruned for matches where the qualifying teams changed. A `KnockoutSyncNotice` banner shows what was removed.

**Live data**: ESPN scoreboard API for real results, FIFA API for tournament stats. Fetched client-side with 60s polling. Offline fallback to cached JSON in `data/`.

**Static data**: All seed data (teams, matches, schedules) lives in `data/wc2026-seed.json`. Imported as JSON modules at build time.

**UI language**: Vietnamese throughout all components.

## Testing

- **24 Vitest test files** covering the FIFA engine (standings algorithm, bracket resolution, Annex C, knockout sync, podium, schedule, etc.) and a store integration test
- **8 Playwright E2E spec files** covering groups, knockout, navigation, responsive layout, live sync, and full tournament simulation
- Vitest setup mocks `localStorage` with an in-memory Map (`vitest.setup.ts`)
- Playwright uses `localhost:3000` with the dev server auto-started

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
