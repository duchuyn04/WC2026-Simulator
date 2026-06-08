import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../data/third-place-combinations.json");

const GROUPS = "ABCDEFGHIJKL".split("");
const SLOT_KEYS = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];

async function fetchWikitext() {
  const url =
    "https://en.wikipedia.org/w/index.php?title=Template:2026_FIFA_World_Cup_third-place_table&action=raw";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.text();
}

function parseQualifiedFromLine(line) {
  const slotStart = line.search(/\|\|\s*3[A-L]/);
  const groupSection = slotStart > 0 ? line.slice(0, slotStart) : line;
  const qualified = [];
  for (const g of GROUPS) {
    if (groupSection.includes(`'''${g}'''`)) qualified.push(g);
  }
  return qualified;
}

function parseSlotCells(line) {
  const slots = [];
  const matches = line.matchAll(/3([A-L])/g);
  for (const m of matches) slots.push(`3${m[1]}`);
  return slots.slice(-8);
}

function parseCombinations(wikitext) {
  const combinations = {};
  const lines = wikitext.split("\n");

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.includes("'''")) continue;

    let slots = parseSlotCells(line);
    if (slots.length < 8) {
      for (const extra of [lines[i + 1], lines[i + 2]]) {
        if (extra?.includes("3")) {
          const s2 = parseSlotCells(extra);
          if (s2.length === 8) {
            slots = s2;
            break;
          }
        }
      }
    }

    if (slots.length !== 8) continue;

    const qualified = parseQualifiedFromLine(line);
    if (qualified.length !== 8) continue;

    const key = qualified.join(",");
    const mapping = {};
    SLOT_KEYS.forEach((slot, idx) => {
      mapping[slot] = slots[idx];
    });
    combinations[key] = mapping;
  }

  return combinations;
}

async function main() {
  console.log("Fetching Wikipedia Annex C table...");
  const wikitext = await fetchWikitext();
  const combinations = parseCombinations(wikitext);
  const count = Object.keys(combinations).length;
  console.log(`Parsed ${count} combinations`);

  if (count < 400) {
    throw new Error(`Expected ~495 combinations, got ${count}`);
  }

  const output = {
    source: "Wikipedia Template:2026_FIFA_World_Cup_third-place_table",
    slotKeys: SLOT_KEYS,
    matchSlots: {
      "1A": { matchNumber: 79, placeholder: "3CEFHI" },
      "1B": { matchNumber: 85, placeholder: "3EFGIJ" },
      "1D": { matchNumber: 81, placeholder: "3BEFIJ" },
      "1E": { matchNumber: 74, placeholder: "3ABCDF" },
      "1G": { matchNumber: 82, placeholder: "3AEHIJ" },
      "1I": { matchNumber: 77, placeholder: "3CDFGH" },
      "1K": { matchNumber: 87, placeholder: "3DEIJL" },
      "1L": { matchNumber: 80, placeholder: "3EHIJK" },
    },
    combinations,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`Wrote → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});