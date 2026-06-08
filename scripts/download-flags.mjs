import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/flags");
const SEED = join(__dirname, "../data/wc2026-seed.json");

const FIFA_TO_ISO2 = {
  ALG: "dz", ARG: "ar", AUS: "au", AUT: "at", BEL: "be", BIH: "ba", BRA: "br",
  CAN: "ca", CIV: "ci", COD: "cd", COL: "co", CPV: "cv", CRO: "hr", CUW: "cw",
  CZE: "cz", ECU: "ec", EGY: "eg", ENG: "gb-eng", ESP: "es", FRA: "fr", GER: "de",
  GHA: "gh", HAI: "ht", IRN: "ir", IRQ: "iq", JOR: "jo", JPN: "jp", KOR: "kr",
  KSA: "sa", MAR: "ma", MEX: "mx", NED: "nl", NOR: "no", NZL: "nz", PAN: "pa",
  PAR: "py", POR: "pt", QAT: "qa", RSA: "za", SCO: "gb-sct", SEN: "sn", SUI: "ch",
  SWE: "se", TUN: "tn", TUR: "tr", URU: "uy", USA: "us", UZB: "uz",
};

async function downloadFlag(fifaCode) {
  const iso2 = FIFA_TO_ISO2[fifaCode];
  if (!iso2) throw new Error(`No ISO mapping for ${fifaCode}`);
  const url = `https://flagcdn.com/w80/${iso2}.png`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${fifaCode} (${url}) → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50) throw new Error(`${fifaCode} empty response`);
  return buf;
}

async function main() {
  const seed = JSON.parse(readFileSync(SEED, "utf8"));
  const codes = new Set();
  for (const g of seed.groups) {
    for (const t of g.teams) codes.add(t.code);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const report = { downloaded: [], failed: [] };

  for (const code of [...codes].sort()) {
    try {
      const buf = await downloadFlag(code);
      const out = join(OUT_DIR, `${code}.png`);
      writeFileSync(out, buf);
      report.downloaded.push(code);
      console.log(`✓ ${code}`);
    } catch (e) {
      report.failed.push({ code, error: String(e.message ?? e) });
      console.error(`✗ ${code}:`, e.message ?? e);
    }
  }

  console.log(`\nDone: ${report.downloaded.length} ok, ${report.failed.length} failed`);
  if (report.failed.length) process.exit(1);
}

main();