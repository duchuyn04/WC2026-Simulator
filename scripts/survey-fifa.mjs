import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../data/wc2026-seed.json");

const SEASON_ID = "285023";
const STAGE_IDS = {
  group: "289273",
  r32: "289287",
  r16: "289288",
  qf: "289289",
  sf: "289290",
  third: "289291",
  final: "289292",
};

async function fetchMatches() {
  const url = `https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=${SEASON_ID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FIFA API ${res.status}`);
  const data = await res.json();
  return data.Results;
}

function pickName(arr) {
  return arr?.find((n) => n.Locale === "en-GB")?.Description ?? "";
}

function mapTeam(t) {
  if (!t) return null;
  return {
    id: t.IdTeam,
    code: t.Abbreviation,
    name: pickName(t.TeamName),
    flagUrl: `/flags/${t.Abbreviation}.png`,
  };
}

function formatVietnamDateTime(isoUtc) {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  const date = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${date} · ${time}`;
}

function mapMatch(m) {
  const group = pickName(m.GroupName);
  const groupLetter = group.replace("Group ", "") || null;
  return {
    id: m.IdMatch,
    matchNumber: m.MatchNumber,
    stage: pickName(m.StageName),
    idStage: m.IdStage,
    group: groupLetter,
    date: m.Date,
    localDate: m.LocalDate,
    vietnamDate: formatVietnamDateTime(m.Date),
    stadium: pickName(m.Stadium?.Name),
    city: pickName(m.Stadium?.CityName),
    home: mapTeam(m.Home),
    away: mapTeam(m.Away),
    homeScore: m.HomeTeamScore,
    awayScore: m.AwayTeamScore,
    placeholderA: m.PlaceHolderA,
    placeholderB: m.PlaceHolderB,
  };
}

async function main() {
  console.log("Fetching FIFA World Cup 2026 data...");
  const matches = await fetchMatches();
  const groupMatches = matches.filter((m) => m.IdStage === STAGE_IDS.group);
  const knockoutMatches = matches.filter((m) => m.IdStage !== STAGE_IDS.group);

  const groups = {};
  for (const m of groupMatches) {
    const letter = pickName(m.GroupName).replace("Group ", "");
    if (!groups[letter]) {
      groups[letter] = { letter, teams: new Map(), matches: [] };
    }
    const gm = mapMatch(m);
    groups[letter].matches.push(gm);
    if (m.Home) groups[letter].teams.set(m.Home.Abbreviation, mapTeam(m.Home));
    if (m.Away) groups[letter].teams.set(m.Away.Abbreviation, mapTeam(m.Away));
  }

  const seed = {
    seasonId: SEASON_ID,
    stageIds: STAGE_IDS,
    fetchedAt: new Date().toISOString(),
    groups: Object.keys(groups)
      .sort()
      .map((letter) => ({
        letter,
        teams: [...groups[letter].teams.values()],
        matches: groups[letter].matches.sort((a, b) => a.matchNumber - b.matchNumber),
      })),
    knockout: knockoutMatches
      .map(mapMatch)
      .sort((a, b) => a.matchNumber - b.matchNumber),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(seed, null, 2));
  console.log(`Wrote ${seed.groups.length} groups, ${groupMatches.length} group matches, ${knockoutMatches.length} knockout matches → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});