# FIFA-Only Player Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip Wikipedia/Wikidata image sources from the player data layer so player images come exclusively from the FIFA API. The frontend fallback chain remains structurally intact but collapses to FIFA → placeholder at runtime.

**Architecture:** Pure data-layer cleanup. Remove the Wikipedia image-fetching code path from `fetch-fifa-teams-squads.mjs`, delete the Wikidata enrichment script, remove its npm entry, and add a defensive strip pass that removes any pre-existing `wikiPictureUrl` and non-FIFA `pictureSource` values when the fetch script runs. No frontend code changes.

**Tech Stack:** Node.js (ESM scripts), `next` build, Vitest, FIFA API (`api.fifa.com`).

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `scripts/fetch-fifa-teams-squads.mjs` | Fetch FIFA teams + squads, parse Wikipedia squads page (club/caps/goals), write `data/fifa-teams-squads.json` | Edit — drop Wikipedia image path, add strip pass |
| `scripts/enrich-wikidata-images.mjs` | One-shot Wikidata/Wikipedia image enrichment | Delete |
| `package.json` | npm scripts registry | Edit — remove `enrich:wikidata-images` |
| `data/fifa-teams-squads.json` | Generated team/squad data | Regenerate via fetch script |

**Untouched** (verified during brainstorming): `src/components/PortraitImage.tsx`, `PortraitLightbox.tsx`, `TeamRoster.tsx`. The `wikiPictureUrl?: string | null` field stays in the `Player` type as optional and unfilled.

---

## Task 1: Remove Wikipedia image path from `fetch-fifa-teams-squads.mjs`

**Files:**
- Modify: `scripts/fetch-fifa-teams-squads.mjs`

- [ ] **Step 1: Delete the `fetchWikipediaImages` function**

Remove the entire function block at lines 282–312 in `scripts/fetch-fifa-teams-squads.mjs`. This function is no longer called after subsequent edits, but delete the function definition too.

The block to delete starts with:
```js
async function fetchWikipediaImages(titles) {
```
and ends with the closing `}` before the `async function main()` declaration (currently at line 314).

- [ ] **Step 2: Remove the `wikipediaImageTitles` accumulator and its push call**

In `main()`, delete line 320:
```js
const wikipediaImageTitles = [];
```

Inside the `normalizedPlayers.map(...)` callback (currently around line 337), delete:
```js
if (wikiPlayer?.wikiTitle) {
  wikipediaImageTitles.push(wikiPlayer.wikiTitle);
}
```

- [ ] **Step 3: Delete the Wikipedia image write loop**

In `main()`, delete the loop currently at lines 377–390:
```js
const wikipediaImages = await fetchWikipediaImages(wikipediaImageTitles);
let wikipediaImageCount = 0;

for (const team of enrichedTeams) {
  for (const player of team.squad) {
    player.wikiPictureUrl = null;
    if (!player.wikiTitle) continue;
    const imageUrl = wikipediaImages.get(player.wikiTitle);
    if (!imageUrl) continue;
    player.wikiPictureUrl = imageUrl;
    player.pictureSource = "wikipedia";
    wikipediaImageCount += 1;
  }
}
```

Also remove the now-unused `wikipediaImageCount` reference later in the `enrichment` object (handled in Task 2).

- [ ] **Step 4: Verify no remaining references to removed identifiers**

Run from project root:
```bash
grep -n "fetchWikipediaImages\|wikipediaImageTitles\|wikipediaImageCount" scripts/fetch-fifa-teams-squads.mjs
```
Expected: no output. If any line prints, remove the reference.

- [ ] **Step 5: Verify the script still parses**

Run:
```bash
node --check scripts/fetch-fifa-teams-squads.mjs
```
Expected: exits 0 with no error output. (Do NOT run the script itself yet — it would still write the data file with the old shape; we add the strip pass in Task 2 first.)

- [ ] **Step 6: Do not commit yet**

Hold this commit. Tasks 2 and 3 modify the same file, so commit them together in Task 3.

---

## Task 2: Add strip pass and update `enrichment` object

**Files:**
- Modify: `scripts/fetch-fifa-teams-squads.mjs`

- [ ] **Step 1: Add the strip pass before `writeFileSync`**

In `main()`, immediately before the `const output = { ... }` block (currently at line 392), insert:

```js
let fifaCount = 0;
let noneCount = 0;
for (const team of enrichedTeams) {
  for (const player of team.squad) {
    if ("wikiPictureUrl" in player) delete player.wikiPictureUrl;
    if (player.pictureSource && player.pictureSource !== "fifa") {
      player.pictureSource = null;
    }
    if (player.pictureUrl) fifaCount += 1;
    else noneCount += 1;
  }
}
```

- [ ] **Step 2: Update the `enrichment` object**

Replace the existing `enrichment: { ... }` block (currently `wikipediaTeams` + `wikipediaFallbackImages`) with:

```js
enrichment: {
  wikipediaTeams: wikipediaTeams.size,
  imageSources: { fifa: fifaCount, none: noneCount },
},
```

Keep `wikipediaTeams` — it documents the Wikipedia squads page parse and is still populated by the unchanged `parseWikipediaSquads` flow.

- [ ] **Step 3: Verify no stale `wikipediaFallbackImages` reference**

Run:
```bash
grep -n "wikipediaFallbackImages" scripts/fetch-fifa-teams-squads.mjs
```
Expected: no output.

- [ ] **Step 4: Verify the script parses**

Run:
```bash
node --check scripts/fetch-fifa-teams-squads.mjs
```
Expected: exits 0.

- [ ] **Step 5: Do not commit yet**

Commit together with Task 1 and Task 3 changes.

---

## Task 3: Delete `enrich-wikidata-images.mjs` and remove npm script

**Files:**
- Delete: `scripts/enrich-wikidata-images.mjs`
- Modify: `package.json`

- [ ] **Step 1: Delete the script file**

Run from project root:
```bash
rm scripts/enrich-wikidata-images.mjs
```

Expected: file removed, no error. (Bash on Windows: equivalent is `rm` via git bash; if the shell refuses, use `git rm scripts/enrich-wikidata-images.mjs`.)

- [ ] **Step 2: Remove the npm script entry from `package.json`**

Open `package.json` and delete the line:
```json
"enrich:wikidata-images": "node scripts/enrich-wikidata-images.mjs",
```

Be careful to keep the trailing comma on the surrounding `fetch:teams-squads` entry (or remove the comma from that entry if it becomes the last one). The `scripts` block should remain valid JSON.

- [ ] **Step 3: Verify `package.json` is valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('ok')"
```
Expected: prints `ok`.

- [ ] **Step 4: Verify no other reference to the removed script exists**

Run:
```bash
grep -rn "enrich-wikidata-images\|enrich:wikidata-images\|enrich-wikidata" --include="*.json" --include="*.md" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js" .
```
Expected: no output (or only references inside the spec/plan docs, which are documentation of the historical state, not active references — confirm no `package.json` or runtime code line prints).

- [ ] **Step 5: Commit Tasks 1–3 together**

```bash
git add scripts/fetch-fifa-teams-squads.mjs scripts/enrich-wikidata-images.mjs package.json
git status
```

Expected: 3 files staged (1 modified, 1 deleted, 1 modified). The data file should NOT be staged yet.

Then:
```bash
git commit -m "refactor(scripts): drop Wikipedia/Wikidata image fetching

Player images now come exclusively from the FIFA API. Removes the
fetchWikipediaImages function, the wikipediaImageTitles accumulator, and
the wikipedia image write loop from fetch-fifa-teams-squads.mjs. Adds a
strip pass that removes any pre-existing wikiPictureUrl field and
non-FIFA pictureSource values, and updates the enrichment object to
report imageSources: { fifa, none }.

Deletes scripts/enrich-wikidata-images.mjs and its package.json entry."
```

---

## Task 4: Regenerate `data/fifa-teams-squads.json` and verify

**Files:**
- Modify: `data/fifa-teams-squads.json` (regenerated)

- [ ] **Step 1: Run the fetch script**

```bash
npm run fetch:teams-squads
```

Expected output ends with: `Saved 48 teams to .../data/fifa-teams-squads.json`. May take 1–2 minutes due to per-team squad API calls.

- [ ] **Step 2: Verify `wikiPictureUrl` is fully removed**

```bash
grep -c '"wikiPictureUrl"' data/fifa-teams-squads.json
```
Expected: `0`.

- [ ] **Step 3: Verify no non-FIFA `pictureSource` values**

```bash
grep -c '"pictureSource": "wikipedia"' data/fifa-teams-squads.json
grep -c '"pictureSource": "wikipedia-pageimage"' data/fifa-teams-squads.json
grep -c '"pictureSource": "wikidata-commons"' data/fifa-teams-squads.json
```
Expected: `0` for each.

- [ ] **Step 4: Verify FIFA `pictureSource` count**

```bash
grep -c '"pictureSource": "fifa"' data/fifa-teams-squads.json
```
Expected: `323` (or within ±1 if FIFA API updated squad data since the previous fetch on 2026-06-13).

- [ ] **Step 5: Verify enrichment stats**

```bash
node -e "const d=require('./data/fifa-teams-squads.json'); console.log(JSON.stringify(d.enrichment.imageSources, null, 2))"
```
Expected output (or within ±1):
```json
{
  "fifa": 323,
  "none": 925
}
```

Also verify total = 1248 (or current FIFA squad size if it changed):
```bash
node -e "const d=require('./data/fifa-teams-squads.json'); console.log(d.teams.reduce((n,t)=>n+t.squad.length,0))"
```
Expected: `1248` (or current total if FIFA updated).

- [ ] **Step 6: Verify `wikipediaFallbackImages` is gone**

```bash
grep -c "wikipediaFallbackImages" data/fifa-teams-squads.json
```
Expected: `0`.

- [ ] **Step 7: Commit the regenerated data file**

```bash
git add data/fifa-teams-squads.json
git commit -m "chore(data): regenerate squads with FIFA-only images

wikiPictureUrl removed for all 1248 players. imageSources now reports
fifa + none only."
```

---

## Task 5: Run unit tests, build, and browser verification

**Files:** None modified — verification only.

- [ ] **Step 1: Run unit tests**

```bash
npm run test
```
Expected: all tests pass. Per AGENTS.md, the suite imports from `scripts/lib/tournament-stats.mjs`, not from the squads script, so no test should be affected by this change. If any test fails or references `wikiPictureUrl`, investigate before proceeding.

- [ ] **Step 2: Run the build**

```bash
npm run build
```
Expected: completes with no TypeScript or ESLint errors. (Next.js may emit unrelated warnings — those are fine.)

- [ ] **Step 3: Start dev server and open a team page**

```bash
npm run dev
```

Open in browser: `/en/tournaments/mens/worldcup/canadamexicousa2026/teams/canada` (or the route the app uses for team pages; check `src/app/` for the actual path if different).

Expected:
- Players with FIFA `pictureUrl` render the FIFA photo.
- Players without FIFA `pictureUrl` render the `PortraitPlaceholder` (initials + jersey number + "No image" badge in top-right).
- No 404 attempts to `upload.wikimedia.org` in the browser DevTools Network tab.

- [ ] **Step 4: Open a second team and a third team for breadth**

Verify on at least 2 more teams — pick one with many FIFA photos (e.g. Brazil, France) and one with few (e.g. Cape Verde, Curaçao).

- [ ] **Step 5: Click a player tile to test the lightbox fallback path**

Click any player tile. If the FIFA image loads, the lightbox shows it. If you force a 404 (e.g. via DevTools Network → block request), the placeholder should appear without attempting a Wikipedia URL.

- [ ] **Step 6: Mark verification complete**

No commit. Verification step is the gate for declaring the spec implemented.

---

## Self-Review Notes

- **Spec coverage:**
  - Section 1 (context) → informed Tasks 1–3 decisions; no separate task needed.
  - Section 2A (fetch script changes) → Tasks 1 + 2.
  - Section 2B (delete enrich script) → Task 3.
  - Section 2C (package.json) → Task 3.
  - Section 2D (no frontend changes) → confirmed; no task.
  - Section 2E (data regen) → Task 4.
  - Section 3 verification → Task 5.
  - Section 4 rollback → all source changes consolidated into one commit (Task 3 step 5) for single-revert. Data regen is a separate commit (Task 4 step 7), revertible independently.
  - Section 5 file list → matches plan structure exactly.
- **Placeholders:** none. All grep commands, expected outputs, and code blocks are concrete.
- **Type/identifier consistency:** `wikiPictureUrl`, `pictureSource`, `fifaCount`/`noneCount`, `imageSources`, `wikipediaTeams` used consistently across Tasks 1–4 and match the spec.
