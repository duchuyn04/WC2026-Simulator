# Real-time Stats & Live Match Bugfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix player goal double-counting (due to penalty goals generating duplicate events) and enable live stats fetching for active matches that have null scores in the FIFA calendar.

**Architecture:** 
1. In `patchMatchPlayerStats`, we will track the minutes at which each player scores a goal using a `Map<string, Set<string>>` of goal-minutes, preventing multiple goal counts for the same player in the same minute of play.
2. In `isLiveOrCompletedMatch`, we will return `true` for live matches (`OfficialityStatus === 2`) regardless of whether the calendar API has populated scores.

**Tech Stack:** React, Zustand, Next.js, Vitest.

---

### Task 1: Fix Goal Double-counting and Live Match Filtering in Core Stats and Script

**Files:**
- Modify: `src/lib/tournament-stats-core.ts`
- Modify: `scripts/lib/tournament-stats.mjs`
- Modify: `src/lib/__tests__/tournament-stats.test.ts`

- [ ] **Step 1: Write test cases in tournament-stats.test.ts**
  Add unit tests in `src/lib/__tests__/tournament-stats.test.ts` to verify:
  1. `isLiveOrCompletedMatch` returns `true` for a live match (`OfficialityStatus: 2`) even if scores are `null`.
  2. `patchMatchPlayerStats` deduplicates goals scored by the same player at the same minute (e.g. penalty kick and goal events both present).

  ```typescript
  // Add to src/lib/__tests__/tournament-stats.test.ts
  describe("isLiveOrCompletedMatch with null scores", () => {
    it("should accept live matches even with null scores", () => {
      expect(
        isLiveOrCompletedMatch({
          OfficialityStatus: 2,
          HomeTeamScore: null,
          AwayTeamScore: null,
        })
      ).toBe(true);
    });
  });

  describe("patchMatchPlayerStats - penalty goal deduplication", () => {
    it("should not double count a goal when both penalty-kick and goal events occur at the same minute", () => {
      const liveMatch = {
        HomeTeam: {
          IdTeam: "43971",
          Abbreviation: "SUI",
          Players: [
            { IdPlayer: "393480", PlayerName: [{ Locale: "en", Description: "Breel EMBOLO" }] }
          ]
        },
        AwayTeam: { Players: [] }
      };
      const playerStats: Record<string, any> = {};
      const espnSummary = {
        header: { competitions: [] },
        keyEvents: [
          {
            clock: { value: 2700, displayValue: "45'" },
            scoringPlay: true,
            type: { type: "penalty-kick" },
            team: { id: "660" },
            participants: [{ athlete: { displayName: "Breel Embolo" } }]
          },
          {
            clock: { value: 2700, displayValue: "45'" },
            scoringPlay: true,
            type: { type: "goal" },
            team: { id: "660" },
            participants: [{ athlete: { displayName: "Breel Embolo" } }]
          }
        ]
      };
      patchMatchPlayerStats(liveMatch, playerStats, espnSummary, "43971", "660");
      
      const emboloGoals = playerStats["393480"]?.find((row: any) => row[0] === "Goals")?.[1];
      expect(emboloGoals).toBe(1); // Should be exactly 1, not 2
      
      const emboloPenalties = playerStats["393480"]?.find((row: any) => row[0] === "Penalties")?.[1];
      expect(emboloPenalties).toBe(1);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**
  Run: `npm run test`
  Expected: FAIL on the newly added tests.

- [ ] **Step 3: Modify isLiveOrCompletedMatch and patchMatchPlayerStats**
  Update `src/lib/tournament-stats-core.ts` and `scripts/lib/tournament-stats.mjs`:
  
  Update `isLiveOrCompletedMatch`:
  ```typescript
  export function isLiveOrCompletedMatch(match: any) {
    const status = Number(match?.OfficialityStatus);
    if (status === 2) {
      return true;
    }
    const hasScores =
      match?.HomeTeamScore !== null &&
      match?.HomeTeamScore !== undefined &&
      match?.AwayTeamScore !== null &&
      match?.AwayTeamScore !== undefined;
    return status === 1 && hasScores;
  }
  ```

  Update `patchMatchPlayerStats` goals counting logic:
  Add goal tracking Map before processing events:
  ```typescript
  const goalMinutesByPlayer = new Map<string, Set<string>>();
  ```
  And inside the `details` iteration loop:
  ```typescript
  if (event.scoringPlay) {
    if (isOwnGoal) {
      if (teamId && !isOurTeam) {
        const counts = getOrCreateCountObj(athleteName);
        counts.OwnGoals++;
      }
    } else {
      if (isOurTeam) {
        const counts = getOrCreateCountObj(athleteName);
        const rawClock = String(event.clock?.value ?? event.clock?.displayValue ?? "");
        const clock = event.clock?.value ? String(Math.floor(Number(event.clock.value) / 60)) : rawClock.replace(/[^0-9]/g, "");
        
        let minutesSet = goalMinutesByPlayer.get(athleteName);
        if (!minutesSet) {
          minutesSet = new Set<string>();
          goalMinutesByPlayer.set(athleteName, minutesSet);
        }
        
        if (!minutesSet.has(clock)) {
          counts.Goals++;
          minutesSet.add(clock);
        }
      }
    }
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npm run test`
  Expected: PASS

- [ ] **Step 5: Verify ESLint and build**
  Run: `npm run lint` and `npx tsc --noEmit`
  Expected: Success

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add src/lib/tournament-stats-core.ts scripts/lib/tournament-stats.mjs src/lib/__tests__/tournament-stats.test.ts
  git commit -m "fix(stats): prevent goal double-counting and enable live match filtering"
  ```
