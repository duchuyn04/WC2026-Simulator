/**
 * Playwright survey script — navigates FIFA page and validates API responses.
 * Run: npx playwright test scripts/survey-fifa-playwright.mjs (or node with playwright)
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT = join(__dirname, "../data/survey-report.json");

const FIFA_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures?country=VN&wtw-filter=ALL";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const apiResponses = [];

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("api.fifa.com/api/v3/calendar/matches")) {
      try {
        const body = await response.json();
        apiResponses.push({
          url,
          status: response.status(),
          matchCount: body.Results?.length ?? 0,
        });
      } catch {
        /* ignore */
      }
    }
  });

  await page.goto(FIFA_URL, { waitUntil: "networkidle", timeout: 60000 });

  const cookieBtn = page.getByRole("button", { name: /OK|Accept|I'm OK/i });
  if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cookieBtn.click();
  }

  const title = await page.title();
  const snapshot = {
    surveyedAt: new Date().toISOString(),
    url: FIFA_URL,
    title,
    apiResponses,
    hasMatchesSection: await page.getByText(/Group [A-L]/i).first().isVisible().catch(() => false),
  };

  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, JSON.stringify(snapshot, null, 2));
  console.log("Playwright survey complete:", JSON.stringify(snapshot, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});