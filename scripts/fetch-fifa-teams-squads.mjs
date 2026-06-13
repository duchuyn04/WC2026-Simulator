import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../data/fifa-teams-squads.json");

let rankings = {};
try {
  const rankingsPath = join(__dirname, "../data/fifa-rankings.json");
  const rankingsData = JSON.parse(readFileSync(rankingsPath, "utf8"));
  rankings = rankingsData.rankings ?? {};
} catch (err) {
  console.warn("Could not load live rankings, using fallback", err);
}

function getRankingFromRankingsFile(code) {
  return rankings[code] ?? null;
}

const TEAM_APPEARANCES = {
  "CAN": 2, "MEX": 17, "USA": 11, "ALG": 4, "ARG": 18, "AUS": 6, "AUT": 7, "BEL": 13,
  "BIH": 1, "BRA": 22, "CPV": 0, "COL": 6, "COD": 1, "CIV": 3, "CRO": 6, "CUW": 0,
  "CZE": 9, "ECU": 4, "EGY": 3, "ENG": 16, "FRA": 16, "GER": 20, "GHA": 4, "HAI": 1,
  "IRN": 6, "IRQ": 1, "JPN": 7, "JOR": 0, "KOR": 10, "MAR": 6, "NED": 10, "NZL": 2,
  "NOR": 3, "PAN": 1, "PAR": 8, "POR": 8, "QAT": 1, "KSA": 6, "SCO": 7, "SEN": 3,
  "RSA": 3, "ESP": 16, "SWE": 12, "SUI": 12, "TUN": 6, "TUR": 2, "URU": 14, "UZB": 0
};

const SEASON_ID = "285023";
const COMPETITION_ID = "17";
const LANGUAGE = "en";
const TEAMS_URL =
  "https://cxm-api.fifa.com/fifaplusweb/api/sections/teamsModule/4v5Yng3VdGD9c1cpnOIff1?locale=en&limit=200";
const WIKIPEDIA_SQUADS_URL =
  "https://en.wikipedia.org/w/index.php?title=2026_FIFA_World_Cup_squads&action=raw";

const WIKI_HEADING_TO_SLUG = new Map([
  ["Cape Verde", "cabo-verde"],
  ["Bosnia and Herzegovina", "bosnia-herzegovina"],
  ["Czech Republic", "czechia"],
  ["DR Congo", "congo-dr"],
  ["Iran", "ir-iran"],
  ["Ivory Coast", "cote-d-ivoire"],
  ["South Korea", "korea-republic"],
  ["Turkey", "turkiye"],
  ["United States", "usa"],
]);

function localizedValue(value) {
  if (!Array.isArray(value)) return null;
  return value.find((item) => item.Locale === "en-GB")?.Description ?? value[0]?.Description ?? null;
}

function codeFromFlagUrl(flagUrl) {
  return flagUrl?.match(/\/([A-Z]{3})$/)?.[1] ?? null;
}

function groupFromStage(stage) {
  return stage?.match(/Group\s+([A-L])/i)?.[1] ?? null;
}

function normalizePlayer(player) {
  return {
    id: player.IdPlayer,
    name: localizedValue(player.PlayerName),
    shortName: localizedValue(player.ShortName),
    jerseyNumber: player.JerseyNum,
    position: localizedValue(player.PositionLocalized),
    realPosition: localizedValue(player.RealPositionLocalized),
    birthDate: player.BirthDate,
    heightCm: player.Height,
    weightKg: player.Weight,
    countryCode: player.IdCountry,
    pictureUrl: player.PlayerPicture?.PictureUrl ?? player.PictureUrl ?? null,
    pictureSource: player.PlayerPicture?.PictureUrl || player.PictureUrl ? "fifa" : null,
  };
}

function normalizeOfficial(official) {
  return {
    id: official.IdCoach,
    name: localizedValue(official.Name),
    alias: localizedValue(official.Alias),
    role: official.Role,
    roleLabel: official.Role === 0 ? "Head coach" : "Coach",
    birthDate: official.BirthDate,
    countryCode: official.IdCountry,
    pictureUrl: official.PictureUrl ?? official.ThumbnailUrl ?? null,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      "user-agent": "wc2026-app data fetcher (local development; contact: none)",
    },
  });

  if (response.status === 429 && attempt < 5) {
    await wait(1500 * attempt);
    return fetchJson(url, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      accept: "text/plain, */*",
      "user-agent": "wc2026-app data fetcher",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }

  return response.text();
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeLookupName(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function splitTopLevel(value) {
  const parts = [];
  let current = "";
  let templateDepth = 0;
  let linkDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const pair = value.slice(index, index + 2);

    if (pair === "{{") {
      templateDepth += 1;
      current += pair;
      index += 1;
      continue;
    }

    if (pair === "}}") {
      templateDepth = Math.max(0, templateDepth - 1);
      current += pair;
      index += 1;
      continue;
    }

    if (pair === "[[") {
      linkDepth += 1;
      current += pair;
      index += 1;
      continue;
    }

    if (pair === "]]") {
      linkDepth = Math.max(0, linkDepth - 1);
      current += pair;
      index += 1;
      continue;
    }

    if (value[index] === "|" && templateDepth === 0 && linkDepth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += value[index];
  }

  parts.push(current);
  return parts;
}

function parseTemplateParams(templateLine) {
  const inner = templateLine.replace(/^{{|}}$/g, "");
  const [, ...params] = splitTopLevel(inner);
  const parsed = new Map();

  for (const param of params) {
    const equalIndex = param.indexOf("=");
    if (equalIndex === -1) continue;
    parsed.set(param.slice(0, equalIndex).trim(), param.slice(equalIndex + 1).trim());
  }

  return parsed;
}

function parseWikiLink(value) {
  const match = value?.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (!match) {
    return {
      title: null,
      text: value?.replace(/''|'''/g, "").trim() || null,
    };
  }

  return {
    title: match[1].trim(),
    text: (match[2] ?? match[1]).replace(/''|'''/g, "").trim(),
  };
}

function parseWikipediaSquads(raw) {
  const teams = new Map();
  const headingRegex = /^===([^=\n]+)===$/gm;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(raw)) !== null) {
    headings.push({ heading: match[1].trim(), index: match.index });
  }

  for (let index = 0; index < headings.length; index += 1) {
    const { heading } = headings[index];
    const nextIndex = headings[index + 1]?.index ?? raw.length;
    const section = raw.slice(headings[index].index, nextIndex);
    const slug = WIKI_HEADING_TO_SLUG.get(heading) ?? slugify(heading);
    const players = new Map();
    const playersByName = new Map();

    for (const line of section.match(/^{{nat fs g player\|.+}}$/gm) ?? []) {
      const params = parseTemplateParams(line);
      const playerLink = parseWikiLink(params.get("name"));
      const clubLink = parseWikiLink(params.get("club"));
      const jerseyNumber = Number(params.get("no"));

      if (!Number.isFinite(jerseyNumber)) continue;

      const parsedPlayer = {
        caps: Number(params.get("caps")),
        goals: Number(params.get("goals")),
        wikiTitle: playerLink.title,
        wikiName: playerLink.text,
        club: {
          name: clubLink.text,
          wikiTitle: clubLink.title,
          countryCode: params.get("clubnat") ?? null,
        },
      };

      players.set(jerseyNumber, parsedPlayer);
      if (playerLink.text) {
        playersByName.set(normalizeLookupName(playerLink.text), parsedPlayer);
      }
    }

    if (players.size > 0) {
      teams.set(slug, { heading, players, playersByName });
    }
  }

  return teams;
}

async function fetchWikipediaImages(titles) {
  const imageMap = new Map();
  const uniqueTitles = [...new Set(titles.filter(Boolean))];

  for (let index = 0; index < uniqueTitles.length; index += 25) {
    const batch = uniqueTitles.slice(index, index + 25);
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "900");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("titles", batch.join("|"));

    try {
      const data = await fetchJson(url.toString());
      for (const page of Object.values(data.query?.pages ?? {})) {
        if (page.title && page.thumbnail?.source) {
          imageMap.set(page.title, page.thumbnail.source);
        }
      }
    } catch (error) {
      console.warn(`Skipping Wikipedia image batch after retries: ${error.message}`);
    }

    await wait(250);
  }

  return imageMap;
}

async function main() {
  const [teamsModule, wikipediaRaw] = await Promise.all([
    fetchJson(TEAMS_URL),
    fetchText(WIKIPEDIA_SQUADS_URL),
  ]);
  const wikipediaTeams = parseWikipediaSquads(wikipediaRaw);
  const wikipediaImageTitles = [];
  const teams = teamsModule.teams ?? [];

  const enrichedTeams = await Promise.all(
    teams.map(async (team) => {
      const squadUrl = `https://api.fifa.com/api/v3/teams/${team.teamId}/squad?idCompetition=${COMPETITION_ID}&idSeason=${SEASON_ID}&language=${LANGUAGE}`;
      const squad = await fetchJson(squadUrl);
      const officials = (squad.Officials ?? []).map(normalizeOfficial);
      const slug = team.teamPageUrl?.split("/").filter(Boolean).at(-1) ?? null;
      const wikipediaPlayers = wikipediaTeams.get(slug)?.players ?? new Map();
      const wikipediaPlayersByName = wikipediaTeams.get(slug)?.playersByName ?? new Map();
      const normalizedPlayers = (squad.Players ?? []).map((player) => {
        const normalizedPlayer = normalizePlayer(player);
        const wikiPlayer =
          wikipediaPlayers.get(normalizedPlayer.jerseyNumber) ??
          wikipediaPlayersByName.get(normalizeLookupName(normalizedPlayer.name ?? ""));
        if (wikiPlayer?.wikiTitle) {
          wikipediaImageTitles.push(wikiPlayer.wikiTitle);
        }

        return {
          ...normalizedPlayer,
          caps: wikiPlayer?.caps ?? null,
          goals: wikiPlayer?.goals ?? null,
          wikiTitle: wikiPlayer?.wikiTitle ?? null,
          wikiName: wikiPlayer?.wikiName ?? null,
          club: wikiPlayer?.club ?? null,
        };
      });

      const code = codeFromFlagUrl(team.teamFlag);
      return {
        id: team.teamId,
        code,
        name: team.teamName,
        slug,
        pageUrl: team.teamPageUrl,
        flagUrl: team.teamFlag,
        confederationId: team.confederationId,
        group: groupFromStage(team.stage),
        stage: team.stage,
        worldRanking: team.worldRanking ?? getRankingFromRankingsFile(code),
        appearances: team.appearances ?? TEAM_APPEARANCES[code] ?? 0,
        hostTeam: team.hostTeam,
        colors: {
          primary: team.teamEnrichmentData?.primaryColor ?? null,
          secondary: team.teamEnrichmentData?.secondaryColor ?? null,
          primaryText: team.teamEnrichmentData?.primaryTextColor ?? null,
          secondaryText: team.teamEnrichmentData?.secondaryTextColor ?? null,
        },
        headCoach: officials.find((official) => official.role === 0) ?? null,
        officials,
        squad: normalizedPlayers,
      };
    }),
  );

  const wikipediaImages = await fetchWikipediaImages(wikipediaImageTitles);
  let wikipediaImageCount = 0;

  for (const team of enrichedTeams) {
    for (const player of team.squad) {
      player.wikiPictureUrl = null;
      if (!player.wikiTitle) continue;
      const imageUrl = wikipediaImages.get(player.wikiTitle);
      if (!imageUrl) continue;
      player.wikiPictureUrl = imageUrl;
      player.pictureSource = "wikipedia";
      wikipediaImageCount += 1;
    }
  }

  const output = {
    source: {
      teamsUrl: TEAMS_URL,
      squadUrlTemplate:
        "https://api.fifa.com/api/v3/teams/{teamId}/squad?idCompetition=17&idSeason=285023&language=en",
      wikipediaSquadsUrl: "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads",
    },
    fetchedAt: new Date().toISOString(),
    seasonId: SEASON_ID,
    competitionId: COMPETITION_ID,
    count: enrichedTeams.length,
    enrichment: {
      wikipediaTeams: wikipediaTeams.size,
      wikipediaFallbackImages: wikipediaImageCount,
    },
    teams: enrichedTeams,
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Saved ${enrichedTeams.length} teams to ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
