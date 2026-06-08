import { describe, it, expect, test } from "vitest";
import { seed } from "../../data";
import {
  buildKnockoutTree,
  layoutBracketSubtree,
  parseWinnerFeeder,
  getBracketCenterRow,
} from "../bracket-tree";

describe("bracket tree invariants", () => {
  const tree = buildKnockoutTree(seed.knockout);
  const left = layoutBracketSubtree(tree.left);
  const right = layoutBracketSubtree(tree.right);

  it("has unique slot match numbers per half", () => {
    const leftNums = left.slots.map((s) => s.matchNumber);
    const rightNums = right.slots.map((s) => s.matchNumber);
    expect(new Set(leftNums).size).toBe(leftNums.length);
    expect(new Set(rightNums).size).toBe(rightNums.length);
  });

  it("R32 leaves have round 0", () => {
    const r32 = left.slots.filter((s) => s.round === 0);
    expect(r32).toHaveLength(8);
    for (const s of r32) {
      expect(s.matchNumber).toBeGreaterThanOrEqual(73);
      expect(s.matchNumber).toBeLessThanOrEqual(96);
    }
  });

  test.each(left.slots.map((s) => [s.matchNumber, s.round, s.row] as const))(
    "left slot #%i round %i row %i is non-negative",
    (num, round, row) => {
      expect(num).toBeGreaterThan(0);
      expect(round).toBeGreaterThanOrEqual(0);
      expect(row).toBeGreaterThanOrEqual(0);
    }
  );

  test.each(right.slots.map((s) => [s.matchNumber, s.round, s.row] as const))(
    "right slot #%i round %i row %i is non-negative",
    (num, round, row) => {
      expect(num).toBeGreaterThan(0);
      expect(round).toBeGreaterThanOrEqual(0);
      expect(row).toBeGreaterThanOrEqual(0);
    }
  );

  it("semi-final 101 is centered on left", () => {
    const center = getBracketCenterRow(tree);
    const sf = left.slots.find((s) => s.matchNumber === 101);
    expect(sf?.row).toBe(center);
  });

  it("every W-placeholder in knockout tree is parseable", () => {
    for (const m of seed.knockout) {
      for (const label of [m.placeholderA, m.placeholderB]) {
        if (label.startsWith("W")) {
          expect(parseWinnerFeeder(label)).toBe(Number(label.slice(1)));
        } else {
          expect(parseWinnerFeeder(label)).toBeNull();
        }
      }
    }
  });

  it("feeder W-numbers always refer to earlier matches", () => {
    for (const m of seed.knockout) {
      for (const label of [m.placeholderA, m.placeholderB]) {
        const feeder = parseWinnerFeeder(label);
        if (feeder) {
          expect(feeder).toBeLessThan(m.matchNumber);
        }
      }
    }
  });
});