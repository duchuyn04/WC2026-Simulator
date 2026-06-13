# Player Image Fallback Design Spec

- **Status**: Approved
- **Date**: 2026-06-13
- **Author**: Antigravity AI

## 1. Context & Requirements
Currently, the application displays player pictures on the team details page.
At build-time, the data-fetching scripts overwrite the `pictureUrl` field in `data/fifa-teams-squads.json` with a Wikipedia/Wikidata image if the FIFA API does not provide a picture.
If a FIFA image URL is provided but is broken at runtime (e.g. returns a 404), the component immediately falls back to the text/jersey placeholder.

The goal is to implement a **runtime fallback mechanism** in the frontend:
1. **First Priority**: Try loading the FIFA API image.
2. **Second Priority**: If the FIFA image is not available or fails to load at runtime (returns an error), fall back to the Wikipedia/Wikidata image.
3. **Third Priority**: If both are unavailable or fail, fall back to the custom local placeholder.

## 2. Proposed Changes

### A. Data Schema & Scripts
We will store both URL fields in the player database object inside `data/fifa-teams-squads.json`:
- `pictureUrl`: strictly stores the FIFA API picture URL (or `null` if none).
- `wikiPictureUrl`: stores the Wikipedia or Wikidata fallback picture URL (or `null` if none).

#### Script updates:
1. **`scripts/fetch-fifa-teams-squads.mjs`**:
   - `pictureUrl` will only store the FIFA API image.
   - When fetching Wikipedia images, save the retrieved image URL into `wikiPictureUrl` instead of overwriting `pictureUrl`.
2. **`scripts/enrich-wikidata-images.mjs`**:
   - Find Wikidata images for players.
   - Save the Wikidata image URL into `wikiPictureUrl` instead of overwriting `pictureUrl`.

### B. Frontend Components

#### 1. `src/components/PortraitImage.tsx`
- Add `fallbackSrc?: string | null` to the props.
- Track loading states:
  - If `src` is present, attempt to load it.
  - If loading fails (triggers `onError`), check if `fallbackSrc` is present. If yes, try loading `fallbackSrc`.
  - If `fallbackSrc` also fails, or if neither image URL was present, render `<PortraitPlaceholder />`.
  
#### 2. `src/components/PortraitLightbox.tsx`
- Add `fallbackSrc?: string | null` to the props.
- Pass `fallbackSrc` down to both the grid `PortraitImage` and the modal lightbox `PortraitImage`.

#### 3. `src/components/TeamRoster.tsx`
- Update the `Player` type definition to include `wikiPictureUrl?: string | null`.
- Pass `fallbackSrc={player.wikiPictureUrl}` to `PortraitLightbox`.

## 3. Testing and Verification Plan
1. **Local Build**: Run `npm run build` and ensure there are no compilation or TypeScript errors.
2. **Unit Tests**: Run `npm run test` to make sure all existing tests pass.
3. **Data Fetching Verification**:
   - Run `npm run fetch:teams-squads` to regenerate the data.
   - Run `npm run enrich:wikidata-images` to add Wikidata fallbacks.
   - Verify that `data/fifa-teams-squads.json` contains both `pictureUrl` and `wikiPictureUrl` for players.
4. **Visual Verification**: Navigate to a team details page (e.g. Canada or USA) using the app or browser to verify that:
   - Players with FIFA pictures show FIFA pictures.
   - Players without FIFA pictures but with Wikipedia pictures display their Wikipedia portraits.
   - Players with broken FIFA URLs fall back to Wikipedia portraits.
   - Players with no images show the placeholder.
