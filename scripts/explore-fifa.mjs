import { chromium } from "playwright";

const URL = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams";

async function main() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("api.fifa.com") || url.includes("cxm-api.fifa.com")) {
      try {
        const body = await response.json();
        console.log(`[API] ${url}`);
        if (body.Results || Array.isArray(body)) {
          console.log(` -> Array length: ${(body.Results || body).length}`);
        }
      } catch {}
    }
  });

  console.log("Navigating to", URL);
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  
  const links = await page.$$eval('a', as => as.map(a => a.href));
  const uniqueLinks = Array.from(new Set(links));
  console.log(`Found ${uniqueLinks.length} total links.`);
  
  const fs = await import('fs');
  fs.writeFileSync('scripts/fifa_teams_page.html', await page.content());
  console.log("Saved HTML to scripts/fifa_teams_page.html");

  await browser.close();
}

main().catch(console.error);
