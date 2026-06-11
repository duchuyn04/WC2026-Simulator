import fs from 'fs';

async function testEspn() {
  const res = await fetch("http://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard");
  const data = await res.json();
  fs.writeFileSync("espn-data.json", JSON.stringify(data, null, 2));
  console.log("Written to espn-data.json");
}

testEspn();
