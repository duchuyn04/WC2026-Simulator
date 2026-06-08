const res = await fetch(
  "https://en.wikipedia.org/w/index.php?title=Template:2026_FIFA_World_Cup_third-place_table&action=raw"
);
const lines = (await res.text()).split("\n");
const line = lines.find((l) => l.trim().startsWith("| || || || || '''E'''"));
console.log(line);
const parts = line.split("||").map((p) => p.trim());
parts.forEach((p, i) => console.log(i, JSON.stringify(p)));