import { chromium, devices } from 'playwright';

const iPhone = devices['iPhone 14'];
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  ...iPhone,
  locale: 'vi-VN',
});
const page = await context.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.screenshot({ path: 'screenshot-iphone-home.png', fullPage: false });
console.log('Home page screenshot taken');

// Find clickable match elements
const allButtons = await page.$$eval('button, [role="button"], a', els => 
  els.slice(0, 30).map((el, i) => ({
    idx: i,
    tag: el.tagName,
    text: el.textContent?.trim().substring(0, 80),
    class: el.className?.substring?.(0, 80) || ''
  }))
);
console.log('Clickable elements:');
for (const btn of allButtons) {
  console.log(`  [${btn.idx}] <${btn.tag}> "${btn.text}"`);
}

// Try to find and click a match card (look for score patterns like "2 - 1")
const matchEl = await page.$('text=/\\d+\\s*-\\s*\\d+/');
if (matchEl) {
  console.log('\nFound match score element, clicking...');
  await matchEl.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot-iphone-match-detail.png', fullPage: false });
  console.log('Match detail screenshot taken');

  // Try to click lineup tab
  const lineupTab = await page.$('text=/đội hình|lineup/i');
  if (lineupTab) {
    console.log('Found lineup tab, clicking...');
    await lineupTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshot-iphone-lineup.png', fullPage: false });
    console.log('Lineup screenshot taken');
  } else {
    console.log('No lineup tab found');
  }
} else {
  console.log('No match score element found');
}

await browser.close();
console.log('Done!');
