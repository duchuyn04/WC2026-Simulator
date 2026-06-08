import { describe, it, expect } from "vitest";
import {
  buildKnockoutTree,
  layoutBracketSubtree,
  getBracketCenterRow,
  parseWinnerFeeder,
} from "../bracket-tree";
import { seed } from "../../data";

describe("bracket-tree", () => {
  it("parses winner feeder placeholders", () => {
    expect(parseWinnerFeeder("W89")).toBe(89);
    expect(parseWinnerFeeder("1A")).toBeNull();
  });

  it("builds left and right subtrees from semi-finals", () => {
    const tree = buildKnockoutTree(seed.knockout);
    expect(tree.left.matchNumber).toBe(101);
    expect(tree.right.matchNumber).toBe(102);
    expect(tree.final).toBe(104);
    expect(tree.third).toBe(103);
  });

  it("lays out 8 R32 leaves per half", () => {
    const tree = buildKnockoutTree(seed.knockout);
    const left = layoutBracketSubtree(tree.left);
    const right = layoutBracketSubtree(tree.right);

    const leftR32 = left.slots.filter((slot) => slot.round === 0);
    const rightR32 = right.slots.filter((slot) => slot.round === 0);

    expect(left.leafCount).toBe(8);
    expect(right.leafCount).toBe(8);
    expect(leftR32).toHaveLength(8);
    expect(rightR32).toHaveLength(8);
    expect(left.slots.find((slot) => slot.matchNumber === 101)?.round).toBe(3);
  });

  it("centers semi-finals vertically", () => {
    const tree = buildKnockoutTree(seed.knockout);
    const center = getBracketCenterRow(tree);
    const left = layoutBracketSubtree(tree.left);
    const sf = left.slots.find((slot) => slot.matchNumber === 101);

    expect(sf?.row).toBe(center);
  });
});