import { chromium } from "playwright";
import { setTimeout as wait } from "node:timers/promises";
import fs from "node:fs";
fs.mkdirSync("output/playwright", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await wait(500);
await page.getByRole("button", { name: /Lịch thi đấu & Yêu thích/i }).first().click();
await wait(400);

// 1) Real visible state at 1440px
const real = await page.evaluate(() => {
  const nav = document.querySelector("nav.flex.w-max");
  const wrap = nav.parentElement;
  const cs = getComputedStyle(wrap);
  // Force a real overflow so we can see if scrollbar is shown
  return {
    navScrollWidth: nav.scrollWidth,
    wrapClientWidth: wrap.clientWidth,
    wrapScrollbarWidth: cs.scrollbarWidth,
    wrapMsOverflowStyle: cs.msOverflowStyle,
    wrapClass: wrap.className,
    webkitDisplay: (() => {
      const probe = document.createElement("div");
      probe.className = wrap.className;
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.overflow = "scroll";
      probe.style.width = "100px";
      probe.style.height = "100px";
      probe.innerHTML = "<div style=\"width:300px;height:300px\"></div>";
      document.body.appendChild(probe);
      const result = {
        webkitHeight: getComputedStyle(probe, "::-webkit-scrollbar").height,
        webkitWidth: getComputedStyle(probe, "::-webkit-scrollbar").width,
        webkitDisplay: getComputedStyle(probe, "::-webkit-scrollbar").display,
      };
      document.body.removeChild(probe);
      return result;
    })(),
  };
});

// 2) Force overflow to mimic small viewport (so we can see if a scrollbar would appear)
await page.evaluate(() => {
  const nav = document.querySelector("nav.flex.w-max");
  for (let i = 0; i < 8; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pb-4 text-sm font-medium border-b-2 border-transparent text-zinc-500 whitespace-nowrap";
    b.textContent = "Tab " + (i + 1);
    nav.appendChild(b);
  }
});
await wait(200);
const forced = await page.evaluate(() => {
  const nav = document.querySelector("nav.flex.w-max");
  const wrap = nav.parentElement;
  return {
    navScrollWidth: nav.scrollWidth,
    wrapClientWidth: wrap.clientWidth,
    isOverflowing: nav.scrollWidth > wrap.clientWidth,
    // Try to detect rendered scrollbar via offsetHeight vs scrollHeight
    offsetDiff: wrap.offsetHeight - wrap.clientHeight,
  };
});
const navBox = await page.locator("nav.flex.w-max").boundingBox();
await page.screenshot({
  path: "output/playwright/scroll-check.png",
  clip: { x: 0, y: navBox.y - 4, width: 1440, height: navBox.height + 8 },
});
await browser.close();
console.log(JSON.stringify({ real, forced }, null, 2));
