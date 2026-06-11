import fs from 'fs';

async function fetchMatch() {
  try {
    const res = await fetch('http://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=401860780');
    const data = await res.json();
    fs.writeFileSync('espn-match-summary.json', JSON.stringify(data, null, 2));
    console.log("Saved match summary to espn-match-summary.json");
  } catch (err) {
    console.error(err);
  }
}

fetchMatch();
