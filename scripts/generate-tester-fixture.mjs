import { writeFileSync } from "fs";
import seed from "../data/wc2026-seed.json" with { type: "json" };

const matchResults = {};
for (const group of seed.groups) {
  const winner = group.teams[0].code;
  let i = 0;
  for (const m of group.matches) {
    if (!m.home || !m.away) continue;
    const homeWins = m.home.code === winner;
    const bias = (group.letter.charCodeAt(0) + i) % 3;
    matchResults[m.id] = homeWins
      ? { home: 2 + (bias % 2), away: bias % 2 }
      : { home: bias % 2, away: 2 + (bias % 2) };
    i++;
  }
}

const fixture = {
  _huongDan:
    "Kịch bản 12 bảng đầy đủ 72 trận. Dùng cho TC-004. Tạo lại: node scripts/generate-tester-fixture.mjs",
  matchResults,
  manualOrder: {},
  knockoutWinners: {},
};

writeFileSync(
  "e2e/tester/fixtures/kich-ban-12-bang.json",
  JSON.stringify(fixture, null, 2)
);
console.log("Đã tạo e2e/tester/fixtures/kich-ban-12-bang.json");