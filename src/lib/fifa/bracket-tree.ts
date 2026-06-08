import type { KnockoutMatch } from "./types";

export type BracketTreeNode = {
  matchNumber: number;
  top: BracketTreeNode | null;
  bottom: BracketTreeNode | null;
};

export type BracketLayoutSlot = {
  matchNumber: number;
  round: number;
  row: number;
};

export type KnockoutBracketTree = {
  left: BracketTreeNode;
  right: BracketTreeNode;
  third: number;
  final: number;
};

const LEFT_SF = 101;
const RIGHT_SF = 102;
const THIRD_PLACE = 103;
const FINAL = 104;

export function parseWinnerFeeder(label: string): number | null {
  const match = label.match(/^W(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function buildBracketSubtree(
  matchNumber: number,
  matchesByNumber: Map<number, KnockoutMatch>
): BracketTreeNode {
  const match = matchesByNumber.get(matchNumber);
  if (!match) {
    throw new Error(`Knockout match ${matchNumber} not found`);
  }

  const topFeeder = parseWinnerFeeder(match.placeholderA);
  const bottomFeeder = parseWinnerFeeder(match.placeholderB);

  return {
    matchNumber,
    top: topFeeder ? buildBracketSubtree(topFeeder, matchesByNumber) : null,
    bottom: bottomFeeder ? buildBracketSubtree(bottomFeeder, matchesByNumber) : null,
  };
}

export function buildKnockoutTree(knockoutMatches: KnockoutMatch[]): KnockoutBracketTree {
  const byNumber = new Map(knockoutMatches.map((m) => [m.matchNumber, m]));
  return {
    left: buildBracketSubtree(LEFT_SF, byNumber),
    right: buildBracketSubtree(RIGHT_SF, byNumber),
    third: THIRD_PLACE,
    final: FINAL,
  };
}

type LayoutResult = {
  slots: BracketLayoutSlot[];
  leafCount: number;
};

export function layoutBracketSubtree(node: BracketTreeNode): LayoutResult {
  if (!node.top && !node.bottom) {
    return {
      slots: [{ matchNumber: node.matchNumber, round: 0, row: 0 }],
      leafCount: 1,
    };
  }

  if (!node.top || !node.bottom) {
    throw new Error(`Bracket node ${node.matchNumber} must have two feeders`);
  }

  const top = layoutBracketSubtree(node.top);
  const bottom = layoutBracketSubtree(node.bottom);
  const offset = top.leafCount;

  const bottomSlots = bottom.slots.map((slot) => ({
    ...slot,
    row: slot.row + offset,
  }));

  const topRoot = top.slots.find((slot) => slot.matchNumber === node.top!.matchNumber);
  const bottomRoot = bottom.slots.find((slot) => slot.matchNumber === node.bottom!.matchNumber);

  if (!topRoot || !bottomRoot) {
    throw new Error(`Missing feeder layout for match ${node.matchNumber}`);
  }

  const parentRound = topRoot.round + 1;
  const parentRow = (topRoot.row + bottomRoot.row + offset) / 2;

  return {
    slots: [
      ...top.slots,
      ...bottomSlots,
      { matchNumber: node.matchNumber, round: parentRound, row: parentRow },
    ],
    leafCount: top.leafCount + bottom.leafCount,
  };
}

export function getBracketCenterRow(tree: KnockoutBracketTree): number {
  const left = layoutBracketSubtree(tree.left);
  const maxRow = Math.max(...left.slots.map((slot) => slot.row));
  return maxRow / 2;
}