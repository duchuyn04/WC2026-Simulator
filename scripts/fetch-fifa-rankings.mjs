/**
 * Fetch FIFA Men's World Ranking from the same API used by:
 * https://inside.fifa.com/fifa-world-ranking/men
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../data/fifa-rankings.json");

const SOURCE_PAGE = "https://inside.fifa.com/fifa-world-ranking/men";
const LIVE_API =
  "https://api.fifa.com/api/v3/fifarankings/rankings/live?gender=1&sportType=0&language=en";
const WINDOW_API =
  "https://inside.fifa.com/api/live-world-ranking/get-international-ranking-window?locale=en&category=men";

function pickName(arr) {
  return arr?.find((n) => n.Locale === "en-GB")?.Description ?? arr?.[0]?.Description ?? "";
}

function formatDate(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const [live, window] = await Promise.all([
    fetchJson(LIVE_API),
    fetchJson(`${WINDOW_API}&date=${today}`),
  ]);

  const results = live.Results ?? [];
  if (results.length === 0) throw new Error("No ranking results from FIFA live API");

  const rankings = {};
  const teams = [];

  for (const row of results) {
    const code = row.IdCountry;
    if (!code) continue;
    rankings[code] = row.Rank;
    teams.push({
      code,
      rank: row.Rank,
      prevRank: row.PrevRank ?? null,
      name: pickName(row.TeamName),
      points: row.TotalPoints ?? null,
      confederation: row.ConfederationName ?? null,
    });
  }

  const payload = {
    source: SOURCE_PAGE,
    api: LIVE_API,
    rankingType: "live",
    fetchedAt: new Date().toISOString(),
    lastOfficialUpdate: formatDate(window.lastWindow?.dateTo),
    nextOfficialUpdate: formatDate(window.nextWindow?.dateFrom),
    currentWindow: window.currentWindow
      ? {
          id: window.currentWindow.windowId,
          from: window.currentWindow.dateFrom,
          to: window.currentWindow.dateTo,
          approved: window.currentWindow.rankingApproved,
        }
      : null,
    teamCount: teams.length,
    rankings,
    teams,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");

  console.log(
    `FIFA rankings: ${teams.length} teams → ${OUT}\n` +
      `  Source: ${SOURCE_PAGE}\n` +
      `  Top 3: ${teams
        .slice(0, 3)
        .map((t) => `${t.code} #${t.rank}`)
        .join(", ")}\n` +
      `  Last official: ${payload.lastOfficialUpdate ?? "—"}\n` +
      `  Next official: ${payload.nextOfficialUpdate ?? "—"}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});