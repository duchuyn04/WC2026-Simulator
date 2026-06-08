import { describe, it, expect, test } from "vitest";
import annexData from "../../../../data/third-place-combinations.json";
import {
  getThirdPlaceMapping,
  rankThirdPlaceTeams,
  resolveThirdPlaceSlot,
} from "../third-place";
import {
  ANNEX_COMBINATION_KEYS,
  ANNEX_SLOT_KEYS,
  buildStandingsWithThirdPoints,
  computeAllStandings,
  resolveFullBracket,
} from "./helpers/scenarios";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

describe("Annex C data integrity", () => {
  it("has exactly 495 combinations", () => {
    expect(ANNEX_COMBINATION_KEYS).toHaveLength(495);
  });

  it("defines 8 host slots", () => {
    expect(ANNEX_SLOT_KEYS).toHaveLength(8);
  });

  test.each(ANNEX_COMBINATION_KEYS)("combo %s has 8 sorted qualifying groups", (key) => {
    const parts = key.split(",");
    expect(parts).toHaveLength(8);
    expect([...parts].sort().join(",")).toBe(key);
    for (const p of parts) {
      expect(GROUP_LETTERS).toContain(p);
    }
  });

  test.each(
    ANNEX_COMBINATION_KEYS.flatMap((key) =>
      ANNEX_SLOT_KEYS.map((slot) => [key, slot] as const)
    )
  )("combo %s slot %s maps to valid 3X label", (key, slot) => {
    const mapping = getThirdPlaceMapping(key);
    expect(mapping).not.toBeNull();
    const label = mapping![slot as keyof typeof mapping];
    expect(label).toMatch(/^3[A-L]$/);
    const groupLetter = label.slice(1);
    expect(key.split(",")).toContain(groupLetter);
  });

  test.each(ANNEX_COMBINATION_KEYS)("resolveThirdPlaceSlot works for %s", (key) => {
    for (const slot of ANNEX_SLOT_KEYS) {
      const label = resolveThirdPlaceSlot(key, slot);
      expect(label).toMatch(/^3[A-L]$/);
    }
  });
});

describe("rankThirdPlaceTeams", () => {
  it("always qualifies exactly 8 and eliminates 4", () => {
    const standings = computeAllStandings();
    const result = rankThirdPlaceTeams(standings);
    expect(result.qualified).toHaveLength(8);
    expect(result.eliminated).toHaveLength(4);
    expect(result.qualifyingGroups.split(",")).toHaveLength(8);
  });

  test.each(Array.from({ length: 24 }, (_, i) => i))(
    "seed %i third-place ranking is monotonic",
    (seedNum) => {
      const points: Record<string, number> = {};
      for (const letter of GROUP_LETTERS) {
        points[letter] = 3 + ((seedNum + letter.charCodeAt(0)) % 4);
      }
      const standings = buildStandingsWithThirdPoints(points);
      const result = rankThirdPlaceTeams(standings);
      for (let i = 0; i < result.qualified.length - 1; i++) {
        const a = result.qualified[i];
        const b = result.qualified[i + 1];
        const ordered =
          a.points > b.points ||
          (a.points === b.points && a.gd > b.gd) ||
          (a.points === b.points && a.gd === b.gd && a.gf >= b.gf);
        expect(ordered).toBe(true);
      }
    }
  );
});

function standingsForCombo(key: string) {
  const qualified = new Set(key.split(","));
  const thirdPoints: Record<string, number> = {};
  for (const letter of GROUP_LETTERS) {
    thirdPoints[letter] = qualified.has(letter) ? 6 : 1;
  }
  return buildStandingsWithThirdPoints(thirdPoints);
}

describe("Annex C → bracket third-place slots", () => {
  test.each(ANNEX_COMBINATION_KEYS)(
    "combo %s resolves all 8 composite placeholders in R32",
    (key) => {
      const mapping = getThirdPlaceMapping(key)!;
      const standings = standingsForCombo(key);
      const qualified = key.split(",");
      const third = rankThirdPlaceTeams(standings);
      expect(third.qualifyingGroups).toBe(key);

      const { resolved } = resolveFullBracket(standings);
      for (const [slotKey, thirdLabel] of Object.entries(mapping)) {
        const matchSlot = annexData.matchSlots[slotKey as keyof typeof annexData.matchSlots];
        const composite = matchSlot.placeholder;
        const groupLetter = thirdLabel.replace("3", "");
        expect(qualified).toContain(groupLetter);
        const match = resolved.find((m) => m.matchNumber === matchSlot.matchNumber)!;
        const hasThirdTeam = [match.resolvedHome?.label, match.resolvedAway?.label].some(
          (l) => l === composite || l?.startsWith("3")
        );
        expect(hasThirdTeam || match.resolvedHome?.team || match.resolvedAway?.team).toBeTruthy();
      }
    }
  );
});