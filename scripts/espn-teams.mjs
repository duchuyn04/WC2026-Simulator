import fs from 'fs';

async function fetchTeams() {
  try {
    const res = await fetch('http://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams?limit=200');
    const data = await res.json();
    fs.writeFileSync('espn-teams-raw.json', JSON.stringify(data, null, 2));
    console.log("Saved raw data to espn-teams-raw.json");
  } catch (err) {
    console.error(err);
  }
}

fetchTeams();
