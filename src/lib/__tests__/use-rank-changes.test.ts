import { describe, expect, it } from "vitest";
import { detectRankDeltas, rankOrderKey } from "../use-rank-changes";
import type { TeamStats } from "../fifa/types";

function stat(id: string, code: string, points = 0): TeamStats {
  return {
    team: { id, code, name: code, flagUrl: "" },
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points,
  };
}

describe("rankOrderKey", () => {
  it("giữ nguyên khi chỉ điểm đổi", () => {
    const a = [stat("a", "A", 0), stat("b", "B", 3)];
    const b = [stat("a", "A", 9), stat("b", "B", 6)];
    expect(rankOrderKey(a)).toBe(rankOrderKey(b));
  });

  it("đổi khi thứ hạng đổi", () => {
    const a = [stat("a", "A"), stat("b", "B")];
    const b = [stat("b", "B"), stat("a", "A")];
    expect(rankOrderKey(a)).not.toBe(rankOrderKey(b));
  });
});

describe("detectRankDeltas", () => {
  it("không delta lần đầu (chưa seed)", () => {
    const ranked = [stat("a", "A"), stat("b", "B")];
    const { deltas } = detectRankDeltas(ranked, new Map(), false);
    expect(deltas.size).toBe(0);
  });

  it("phát hiện lên/xuống hạng", () => {
    const prev = new Map([
      ["a", 0],
      ["b", 1],
    ]);
    const ranked = [stat("b", "B"), stat("a", "A")];
    const { deltas } = detectRankDeltas(ranked, prev, true);
    expect(deltas.get("a")).toBe(-1);
    expect(deltas.get("b")).toBe(1);
  });

  it("không delta khi thứ tự giữ nguyên", () => {
    const prev = new Map([
      ["a", 0],
      ["b", 1],
    ]);
    const ranked = [stat("a", "A", 9), stat("b", "B", 6)];
    const { deltas } = detectRankDeltas(ranked, prev, true);
    expect(deltas.size).toBe(0);
  });
});