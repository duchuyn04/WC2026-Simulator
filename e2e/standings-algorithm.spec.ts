import { test, expect } from "@playwright/test";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { seed } from "../src/lib/data";
import { calculateGroupStandings } from "../src/lib/fifa/standings";
import { rankThirdPlaceTeams } from "../src/lib/fifa/third-place";
import type { MatchResult } from "../src/lib/fifa/types";
import { gotoFresh, goToTab, openGroupDetail, groupDetailModal } from "./helpers";

/** Vòng 1 bảng A: MEX 2-0 RSA, KOR 1-1 CZE */
const GROUP_A_ROUND1: Array<{ home: number; away: number }> = [
  { home: 2, away: 0 },
  { home: 1, away: 1 },
];

/** Cả 3 vòng bảng A — MEX nhất (9đ), KOR nhì (6đ), CZE ba (1đ), RSA bét (1đ) */
const GROUP_A_FULL: Array<{ home: number; away: number }> = [
  { home: 2, away: 0 }, // MEX-RSA
  { home: 2, away: 1 }, // KOR-CZE
  { home: 0, away: 0 }, // CZE-RSA
  { home: 1, away: 0 }, // MEX-KOR
  { home: 1, away: 3 }, // CZE-MEX
  { home: 1, away: 2 }, // RSA-KOR
];

function groupCard(page: import("@playwright/test").Page, letter: string) {
  return page.getByTestId(`group-card-${letter}`);
}

async function fillGroupScores(
  page: import("@playwright/test").Page,
  letter: string,
  scores: Array<{ home: number; away: number }>
) {
  await openGroupDetail(page, letter);
  const inputs = groupDetailModal(page, letter).locator('input[type="number"]');
  for (let i = 0; i < scores.length; i++) {
    await inputs.nth(i * 2).fill(String(scores[i].home));
    await inputs.nth(i * 2 + 1).fill(String(scores[i].away));
  }
}

async function expectStandingRow(
  page: import("@playwright/test").Page,
  letter: string,
  teamCode: string,
  points: number,
  gd: number
) {
  const row = groupDetailModal(page, letter).getByTestId(`standing-row-${teamCode}`);
  await expect(row).toBeVisible();
  await expect(row.getByText(`${points}pts`)).toBeVisible();
  const gdText = gd > 0 ? `+${gd}` : String(gd);
  await expect(row.getByText(gdText, { exact: true })).toBeVisible();
}

function expectedRound1GroupA() {
  const group = seed.groups.find((g) => g.letter === "A")!;
  const results: Record<string, MatchResult> = {};
  GROUP_A_ROUND1.forEach((score, i) => {
    results[group.matches[i].id] = score;
  });
  return calculateGroupStandings(group, results);
}

function expectedFullGroupA() {
  const group = seed.groups.find((g) => g.letter === "A")!;
  const results: Record<string, MatchResult> = {};
  GROUP_A_FULL.forEach((score, i) => {
    results[group.matches[i].id] = score;
  });
  return calculateGroupStandings(group, results);
}

/** Mỗi bảng: đội[0] thắng hết; điểm hạng 3 = 3 + index bảng mod 4 */
function buildAllGroupsScenario(): Record<string, MatchResult> {
  const results: Record<string, MatchResult> = {};
  for (const group of seed.groups) {
    const winner = group.teams[0].code;
    let i = 0;
    for (const m of group.matches) {
      if (!m.home || !m.away) continue;
      const homeWins = m.home.code === winner;
      const bias = (group.letter.charCodeAt(0) + i) % 3;
      results[m.id] = homeWins
        ? { home: 2 + (bias % 2), away: bias % 2 }
        : { home: bias % 2, away: 2 + (bias % 2) };
      i++;
    }
  }
  return results;
}

function expectedThirdPlace(matchResults: Record<string, MatchResult>) {
  const standings = seed.groups.map((g) => calculateGroupStandings(g, matchResults));
  return rankThirdPlaceTeams(standings);
}

test.describe("Thuật toán BXH — E2E vòng bảng", () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
  });

  test("vòng 1 bảng A: điểm MEX 3, KOR/CZE 1 sau khi nhập tỉ số UI", async ({ page }) => {
    await fillGroupScores(page, "A", GROUP_A_ROUND1);

    const expected = expectedRound1GroupA();
    for (const stat of expected.ranked) {
      await expectStandingRow(page, "A", stat.team.code, stat.points, stat.gd);
    }

    // Thứ hạng đúng: MEX đầu, KOR/CZE có điểm
    await expect(groupDetailModal(page, "A").getByTestId("standing-row-MEX").getByText("3pts")).toBeVisible();

    const korPts = expected.ranked.find((s) => s.team.code === "KOR")!.points;
    const czePts = expected.ranked.find((s) => s.team.code === "CZE")!.points;
    expect(korPts).toBe(1);
    expect(czePts).toBe(1);
    await expectStandingRow(page, "A", "KOR", korPts, expected.ranked.find((s) => s.team.code === "KOR")!.gd);
    await expectStandingRow(page, "A", "CZE", czePts, expected.ranked.find((s) => s.team.code === "CZE")!.gd);
  });

  test("bảng A đủ 6 trận: BXH khớp thuật toán (9/6/1/1 điểm)", async ({ page }) => {
    await fillGroupScores(page, "A", GROUP_A_FULL);

    const expected = expectedFullGroupA();
    expect(expected.first.team.code).toBe("MEX");
    expect(expected.first.points).toBe(9);
    expect(expected.second.team.code).toBe("KOR");
    expect(expected.second.points).toBe(6);
    expect(expected.third.team.code).toBe("CZE");
    expect(expected.fourth.team.code).toBe("RSA");

    for (const stat of expected.ranked) {
      await expectStandingRow(page, "A", stat.team.code, stat.points, stat.gd);
    }

    // Thứ tự hàng theo BXH
    const rows = groupDetailModal(page, "A").locator("[data-testid^='standing-row-']");
    await expect(rows.nth(0)).toHaveAttribute("data-testid", "standing-row-MEX");
    await expect(rows.nth(1)).toHaveAttribute("data-testid", "standing-row-KOR");
    await expect(rows.nth(2)).toHaveAttribute("data-testid", "standing-row-CZE");
    await expect(rows.nth(3)).toHaveAttribute("data-testid", "standing-row-RSA");
  });

  test("cả 12 bảng xong: tab Hạng 3 đúng 8 đội đi tiếp + 4 loại", async ({ page }) => {
    const matchResults = buildAllGroupsScenario();
    const expected = expectedThirdPlace(matchResults);

    const tmpPath = join(tmpdir(), `wc2026-e2e-${Date.now()}.json`);
    writeFileSync(
      tmpPath,
      JSON.stringify({ matchResults, manualOrder: {}, knockoutWinners: {} })
    );

    try {
      await page.locator('input[type="file"]').setInputFiles(tmpPath);
      await expect(page.getByTestId("tab-third")).toBeEnabled();
    } finally {
      unlinkSync(tmpPath);
    }

    await goToTab(page, "third");

    const qualified = expected.qualified;
    const eliminated = expected.eliminated;
    expect(qualified).toHaveLength(8);
    expect(eliminated).toHaveLength(4);

    // 8 đội đi tiếp đúng thứ hạng thuật toán
    for (let i = 0; i < qualified.length; i++) {
      const t = qualified[i];
      const row = page.locator(".border-emerald-800\\/50").nth(i);
      await expect(row.getByText(t.team.name)).toBeVisible();
      await expect(row.getByText(`${t.points}pts`)).toBeVisible();
      await expect(row.getByText(`Bảng ${t.group}`)).toBeVisible();
    }

    // Tổ hợp bảng Annex C khớp
    await expect(page.locator("code.text-amber-400")).toHaveText(expected.qualifyingGroups);

    // 4 đội bị loại
    const eliminatedSection = page
      .locator("div")
      .filter({ has: page.getByText("Bị loại (hạng 3)") });
    for (const t of eliminated) {
      await expect(eliminatedSection.getByText(t.team.name)).toBeVisible();
      await expect(eliminatedSection.getByText(`Bảng ${t.group}`)).toBeVisible();
    }
  });

  test("hòa 1-1 cộng 1 điểm mỗi đội", async ({ page }) => {
    await openGroupDetail(page, "A");
    const modal = groupDetailModal(page, "A");
    await modal.locator('input[type="number"]').nth(0).fill("1");
    await modal.locator('input[type="number"]').nth(1).fill("1");

    const group = seed.groups.find((g) => g.letter === "A")!;
    const expected = calculateGroupStandings(group, {
      [group.matches[0].id]: { home: 1, away: 1 },
    });

    await expectStandingRow(page, "A", "MEX", 1, expected.ranked.find((s) => s.team.code === "MEX")!.gd);
    await expectStandingRow(page, "A", "RSA", 1, expected.ranked.find((s) => s.team.code === "RSA")!.gd);
  });
});