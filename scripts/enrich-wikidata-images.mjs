import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "../data/fifa-teams-squads.json");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      "user-agent": "wc2026-app wikidata image enricher (local development; contact: none)",
    },
  });

  if (response.status === 429 && attempt < 6) {
    await wait(2000 * attempt);
    return fetchJson(url, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }

  return response.json();
}

async function fetchWikipediaPageData(titles) {
  const byTitle = new Map();

  for (const batch of chunk(titles, 25)) {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("prop", "pageimages|pageprops");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "900");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("titles", batch.join("|"));

    const data = await fetchJson(url.toString());

    for (const page of Object.values(data.query?.pages ?? {})) {
      if (!page.title) continue;
      byTitle.set(page.title, {
        thumbnail: page.thumbnail?.source ?? null,
        wikidataId: page.pageprops?.wikibase_item ?? null,
      });
    }

    await wait(350);
  }

  return byTitle;
}

async function fetchWikidataImages(ids) {
  const byId = new Map();

  for (const batch of chunk(ids, 10)) {
    const url = new URL("https://www.wikidata.org/w/api.php");
    url.searchParams.set("action", "wbgetentities");
    url.searchParams.set("format", "json");
    url.searchParams.set("props", "claims");
    url.searchParams.set("ids", batch.join("|"));

    let data;
    try {
      data = await fetchJson(url.toString());
    } catch (error) {
      console.warn(`Skipping Wikidata image batch after retries: ${error.message}`);
      continue;
    }

    for (const [id, entity] of Object.entries(data.entities ?? {})) {
      const filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (!filename) continue;
      byId.set(id, `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=900`);
    }

    await wait(750);
  }

  return byId;
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  const missingPlayers = data.teams.flatMap((team) =>
    team.squad
      .filter((player) => !player.pictureUrl && !player.wikiPictureUrl && player.wikiTitle)
      .map((player) => ({ team, player })),
  );
  const titles = [...new Set(missingPlayers.map(({ player }) => player.wikiTitle))];

  const wikipediaPages = await fetchWikipediaPageData(titles);
  let wikipediaImages = 0;

  for (const { player } of missingPlayers) {
    const pageData = wikipediaPages.get(player.wikiTitle);
    if (!pageData?.thumbnail) continue;
    player.wikiPictureUrl = pageData.thumbnail;
    player.pictureSource = "wikipedia-pageimage";
    wikipediaImages += 1;
  }

  const wikidataIds = [
    ...new Set(
      missingPlayers
        .filter(({ player }) => !player.pictureUrl)
        .map(({ player }) => wikipediaPages.get(player.wikiTitle)?.wikidataId)
        .filter(Boolean),
    ),
  ];
  const wikidataImages = await fetchWikidataImages(wikidataIds);
  let commonsImages = 0;

  for (const { player } of missingPlayers) {
    if (player.wikiPictureUrl) continue;
    const wikidataId = wikipediaPages.get(player.wikiTitle)?.wikidataId;
    const imageUrl = wikidataImages.get(wikidataId);
    if (!imageUrl) continue;
    player.wikiPictureUrl = imageUrl;
    player.pictureSource = "wikidata-commons";
    commonsImages += 1;
  }

  const players = data.teams.flatMap((team) => team.squad);
  const imageSources = players.reduce((counts, player) => {
    const source = player.pictureSource ?? "none";
    counts[source] = (counts[source] ?? 0) + 1;
    return counts;
  }, {});

  data.enrichment = {
    ...(data.enrichment ?? {}),
    imageSources,
    wikidataCommonsFallbackImages: imageSources["wikidata-commons"] ?? 0,
    wikipediaPageImageFallbackImages: imageSources["wikipedia-pageimage"] ?? 0,
    imageEnrichedAt: new Date().toISOString(),
  };

  writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        checkedMissingPlayers: missingPlayers.length,
        wikipediaImages,
        commonsImages,
        withImage: players.filter((player) => player.pictureUrl).length,
        missingImage: players.filter((player) => !player.pictureUrl).length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
