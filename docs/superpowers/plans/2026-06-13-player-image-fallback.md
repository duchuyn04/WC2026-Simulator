# Player Image Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a runtime player image fallback mechanism (FIFA API -> Wikipedia/Wikidata -> Custom Placeholder) on the team details page.

**Architecture:** Update data-fetching scripts to save Wikipedia/Wikidata images into a new `wikiPictureUrl` field rather than overwriting `pictureUrl`. Update the frontend `PortraitImage` component to handle runtime fallback from `src` to `fallbackSrc` upon load failure (`onError`).

**Tech Stack:** TypeScript, Next.js, React, Node.js

---

### Task 1: Update fetch-fifa-teams-squads.mjs

**Files:**
- Modify: `scripts/fetch-fifa-teams-squads.mjs`

- [ ] **Step 1: Update the player title collection condition to fetch Wikipedia URLs for all players**
  Replace lines 314-316 in `scripts/fetch-fifa-teams-squads.mjs`:
  ```javascript
  if (wikiPlayer?.wikiTitle && !normalizedPlayer.pictureUrl) {
    wikipediaImageTitles.push(wikiPlayer.wikiTitle);
  }
  ```
  With:
  ```javascript
  if (wikiPlayer?.wikiTitle) {
    wikipediaImageTitles.push(wikiPlayer.wikiTitle);
  }
  ```

- [ ] **Step 2: Save fetched Wikipedia images into `wikiPictureUrl` instead of overwriting `pictureUrl`**
  Replace lines 357-366 in `scripts/fetch-fifa-teams-squads.mjs`:
  ```javascript
  for (const team of enrichedTeams) {
    for (const player of team.squad) {
      if (player.pictureUrl || !player.wikiTitle) continue;
      const imageUrl = wikipediaImages.get(player.wikiTitle);
      if (!imageUrl) continue;
      player.pictureUrl = imageUrl;
      player.pictureSource = "wikipedia";
      wikipediaImageCount += 1;
    }
  }
  ```
  With:
  ```javascript
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

- [ ] **Step 3: Run dry-run syntax check**
  Run: `node scripts/fetch-fifa-teams-squads.mjs --help` (or run it to check for syntax errors)
  Expected: No syntax errors or crash (command should exit successfully).

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add scripts/fetch-fifa-teams-squads.mjs
  git commit -m "feat(data): save wikipedia images to wikiPictureUrl in squads script"
  ```

---

### Task 2: Update enrich-wikidata-images.mjs

**Files:**
- Modify: `scripts/enrich-wikidata-images.mjs`

- [ ] **Step 1: Update missingPlayers filter to check `wikiPictureUrl`**
  Replace lines 101-105 in `scripts/enrich-wikidata-images.mjs`:
  ```javascript
  const missingPlayers = data.teams.flatMap((team) =>
    team.squad
      .filter((player) => !player.pictureUrl && player.wikiTitle)
      .map((player) => ({ team, player })),
  );
  ```
  With:
  ```javascript
  const missingPlayers = data.teams.flatMap((team) =>
    team.squad
      .filter((player) => !player.pictureUrl && !player.wikiPictureUrl && player.wikiTitle)
      .map((player) => ({ team, player })),
  );
  ```

- [ ] **Step 2: Save Wikidata images into `wikiPictureUrl` instead of overwriting `pictureUrl`**
  Replace lines 111-117 in `scripts/enrich-wikidata-images.mjs`:
  ```javascript
  for (const { player } of missingPlayers) {
    const pageData = wikipediaPages.get(player.wikiTitle);
    if (!pageData?.thumbnail) continue;
    player.pictureUrl = pageData.thumbnail;
    player.pictureSource = "wikipedia-pageimage";
    wikipediaImages += 1;
  }
  ```
  With:
  ```javascript
  for (const { player } of missingPlayers) {
    const pageData = wikipediaPages.get(player.wikiTitle);
    if (!pageData?.thumbnail) continue;
    player.wikiPictureUrl = pageData.thumbnail;
    player.pictureSource = "wikipedia-pageimage";
    wikipediaImages += 1;
  }
  ```

- [ ] **Step 3: Save Commons fallback images into `wikiPictureUrl` instead of overwriting `pictureUrl`**
  Replace lines 130-138 in `scripts/enrich-wikidata-images.mjs`:
  ```javascript
  for (const { player } of missingPlayers) {
    if (player.pictureUrl) continue;
    const wikidataId = wikipediaPages.get(player.wikiTitle)?.wikidataId;
    const imageUrl = wikidataImages.get(wikidataId);
    if (!imageUrl) continue;
    player.pictureUrl = imageUrl;
    player.pictureSource = "wikidata-commons";
    commonsImages += 1;
  }
  ```
  With:
  ```javascript
  for (const { player } of missingPlayers) {
    if (player.wikiPictureUrl) continue;
    const wikidataId = wikipediaPages.get(player.wikiTitle)?.wikidataId;
    const imageUrl = wikidataImages.get(wikidataId);
    if (!imageUrl) continue;
    player.wikiPictureUrl = imageUrl;
    player.pictureSource = "wikidata-commons";
    commonsImages += 1;
  }
  ```

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add scripts/enrich-wikidata-images.mjs
  git commit -m "feat(data): save wikidata images to wikiPictureUrl in enrichment script"
  ```

---

### Task 3: Regenerate and verify JSON database

- [ ] **Step 1: Execute fetch-fifa-teams-squads script**
  Run: `node scripts/fetch-fifa-teams-squads.mjs`
  Expected: Console logs showing teams saved successfully.

- [ ] **Step 2: Execute enrich-wikidata-images script**
  Run: `node scripts/enrich-wikidata-images.mjs`
  Expected: Console logs showing Wikidata enrichment results.

- [ ] **Step 3: Verify wikiPictureUrl is populated in fifa-teams-squads.json**
  Run: `git diff data/fifa-teams-squads.json` or grep for `wikiPictureUrl`
  Expected: We see lines adding `wikiPictureUrl` and reverting changes to `pictureUrl` where FIFA had a photo.

- [ ] **Step 4: Commit generated database**
  Run:
  ```bash
  git add data/fifa-teams-squads.json
  git commit -m "chore(data): rebuild squads data with separate wikiPictureUrl field"
  ```

---

### Task 4: Update PortraitImage Component

**Files:**
- Modify: `src/components/PortraitImage.tsx`

- [ ] **Step 1: Update PortraitImage component signature and state logic to support fallbackSrc**
  Replace lines 60-85 in `src/components/PortraitImage.tsx`:
  ```typescript
  export function PortraitImage({
    src,
    alt,
    placeholderProps,
  }: {
    src?: string | null;
    alt: string;
    placeholderProps: Parameters<typeof PortraitPlaceholder>[0];
  }) {
    const [error, setError] = useState(false);

    if (!src || error) {
      return <PortraitPlaceholder {...placeholderProps} />;
    }

    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-32 w-full object-cover object-top sm:h-64"
        onError={() => setError(true)}
      />
    );
  }
  ```
  With:
  ```typescript
  import { useEffect } from "react";

  export function PortraitImage({
    src,
    fallbackSrc,
    alt,
    placeholderProps,
  }: {
    src?: string | null;
    fallbackSrc?: string | null;
    alt: string;
    placeholderProps: Parameters<typeof PortraitPlaceholder>[0];
  }) {
    const [currentSrc, setCurrentSrc] = useState<string | null>(src || fallbackSrc || null);
    const [hasFailedPrimary, setHasFailedPrimary] = useState(false);
    const [hasFailedFallback, setHasFailedFallback] = useState(false);

    useEffect(() => {
      setCurrentSrc(src || fallbackSrc || null);
      setHasFailedPrimary(false);
      setHasFailedFallback(false);
    }, [src, fallbackSrc]);

    const handleError = () => {
      if (currentSrc === src && fallbackSrc && !hasFailedFallback) {
        setHasFailedPrimary(true);
        setCurrentSrc(fallbackSrc);
      } else {
        setHasFailedFallback(true);
        setCurrentSrc(null);
      }
    };

    if (!currentSrc) {
      return <PortraitPlaceholder {...placeholderProps} />;
    }

    return (
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-32 w-full object-cover object-top sm:h-64"
        onError={handleError}
      />
    );
  }
  ```

- [ ] **Step 2: Commit changes**
  Run:
  ```bash
  git add src/components/PortraitImage.tsx
  git commit -m "feat(ui): implement runtime fallback image logic in PortraitImage"
  ```

---

### Task 5: Update PortraitLightbox Component

**Files:**
- Modify: `src/components/PortraitLightbox.tsx`

- [ ] **Step 1: Pass fallbackSrc down to PortraitImage components inside PortraitLightbox**
  Replace `src/components/PortraitLightbox.tsx` lines 14-50:
  ```typescript
  export function PortraitLightbox({ src, alt, placeholderProps, title, subtitle }: Props) {
    const [open, setOpen] = useState(false);

    const modal = open ? (
      <div
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/85 p-3 backdrop-blur-sm sm:items-center sm:p-6"
        role="presentation"
        onClick={() => setOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh lớn của ${title}`}
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-[#0c0f14] shadow-2xl sm:max-h-[calc(100vh-3rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-zinc-100">{title}</h2>
              {subtitle && <p className="truncate text-xs font-semibold text-zinc-500">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-black text-zinc-300 transition hover:border-amber-500 hover:text-amber-300"
            >
              Đóng
            </button>
          </div>

          <div className="min-h-0 flex-1 bg-zinc-950 p-3">
            <div className="h-full overflow-hidden rounded-2xl bg-zinc-900 [&>div]:h-full [&>img]:h-full [&>img]:object-contain [&>img]:object-center">
              <PortraitImage src={src} alt={alt} placeholderProps={placeholderProps} />
            </div>
          </div>
        </div>
      </div>
    ) : null;
  ```
  With:
  ```typescript
  export function PortraitLightbox({ src, fallbackSrc, alt, placeholderProps, title, subtitle }: Props) {
    const [open, setOpen] = useState(false);

    const modal = open ? (
      <div
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/85 p-3 backdrop-blur-sm sm:items-center sm:p-6"
        role="presentation"
        onClick={() => setOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh lớn của ${title}`}
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-[#0c0f14] shadow-2xl sm:max-h-[calc(100vh-3rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-zinc-100">{title}</h2>
              {subtitle && <p className="truncate text-xs font-semibold text-zinc-500">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-black text-zinc-300 transition hover:border-amber-500 hover:text-amber-300"
            >
              Đóng
            </button>
          </div>

          <div className="min-h-0 flex-1 bg-zinc-950 p-3">
            <div className="h-full overflow-hidden rounded-2xl bg-zinc-900 [&>div]:h-full [&>img]:h-full [&>img]:object-contain [&>img]:object-center">
              <PortraitImage src={src} fallbackSrc={fallbackSrc} alt={alt} placeholderProps={placeholderProps} />
            </div>
          </div>
        </div>
      </div>
    ) : null;
  ```

- [ ] **Step 2: Pass fallbackSrc down to the main trigger PortraitImage**
  Replace `src/components/PortraitLightbox.tsx` lines 79-81:
  ```typescript
        <span className="block h-full w-full [&>div]:h-full [&>img]:h-full">
          <PortraitImage src={src} alt={alt} placeholderProps={placeholderProps} />
        </span>
  ```
  With:
  ```typescript
        <span className="block h-full w-full [&>div]:h-full [&>img]:h-full">
          <PortraitImage src={src} fallbackSrc={fallbackSrc} alt={alt} placeholderProps={placeholderProps} />
        </span>
  ```

- [ ] **Step 3: Commit changes**
  Run:
  ```bash
  git add src/components/PortraitLightbox.tsx
  git commit -m "feat(ui): update PortraitLightbox to accept and forward fallbackSrc"
  ```

---

### Task 6: Update TeamRoster Component

**Files:**
- Modify: `src/components/TeamRoster.tsx`

- [ ] **Step 1: Update Player type to include wikiPictureUrl**
  Replace lines 25-36 in `src/components/TeamRoster.tsx`:
  ```typescript
  type Player = {
    id: string;
    name?: string | null;
    pictureUrl?: string | null;
    jerseyNumber?: number | null;
    position?: string | null;
    realPosition?: string | null;
    birthDate?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    club?: { name?: string | null } | null;
  };
  ```
  With:
  ```typescript
  type Player = {
    id: string;
    name?: string | null;
    pictureUrl?: string | null;
    wikiPictureUrl?: string | null;
    jerseyNumber?: number | null;
    position?: string | null;
    realPosition?: string | null;
    birthDate?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    club?: { name?: string | null } | null;
  };
  ```

- [ ] **Step 2: Pass wikiPictureUrl to PortraitLightbox**
  Replace lines 189-202 in `src/components/TeamRoster.tsx`:
  ```typescript
                    <PortraitLightbox
                      src={player.pictureUrl}
                      alt={player.name ?? "Cầu thủ"}
                      title={player.name ?? "Cầu thủ"}
                      subtitle={`${translatePosition(player.realPosition ?? player.position)} · ${team.name}`}
                      placeholderProps={{
                        badge: `#${player.jerseyNumber ?? "-"}`,
                        label: translatePosition(player.realPosition ?? player.position),
                        name: player.name,
                        teamCode: team.code,
                        primaryColor: team.colors.primary,
                        secondaryColor: team.colors.secondary,
                      }}
                    />
  ```
  With:
  ```typescript
                    <PortraitLightbox
                      src={player.pictureUrl}
                      fallbackSrc={player.wikiPictureUrl}
                      alt={player.name ?? "Cầu thủ"}
                      title={player.name ?? "Cầu thủ"}
                      subtitle={`${translatePosition(player.realPosition ?? player.position)} · ${team.name}`}
                      placeholderProps={{
                        badge: `#${player.jerseyNumber ?? "-"}`,
                        label: translatePosition(player.realPosition ?? player.position),
                        name: player.name,
                        teamCode: team.code,
                        primaryColor: team.colors.primary,
                        secondaryColor: team.colors.secondary,
                      }}
                    />
  ```

- [ ] **Step 3: Commit changes**
  Run:
  ```bash
  git add src/components/TeamRoster.tsx
  git commit -m "feat(ui): pass wikiPictureUrl to player portrait in TeamRoster"
  ```

---

### Task 7: Full Verification Build and Tests

- [ ] **Step 1: Run local production build check**
  Run: `npm run build`
  Expected: Successful compilation without errors.

- [ ] **Step 2: Run all unit tests**
  Run: `npm run test`
  Expected: All unit tests pass.
