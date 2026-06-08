import { describe, expect, it } from "vitest";
import { computeStandings } from "../compute-standings";
import { getGroup } from "../data";

describe("computeStandings", () => {
  const group = getGroup("A")!;
  const order = group.teams.map((t) => t.id);

  it("dùng manualOrder khi có", () => {
    const reversed = [...order].reverse();
    const standings = computeStandings({}, { A: reversed }).find((s) => s.letter === "A")!;
    expect(standings.first.team.id).toBe(reversed[0]);
    expect(standings.fourth.team.id).toBe(reversed[3]);
  });

  it("tính từ tỉ số khi không có manualOrder", () => {
    const standings = computeStandings({}, {}).find((s) => s.letter === "A")!;
    expect(standings.ranked).toHaveLength(4);
    expect(standings.first.points).toBe(0);
  });
});