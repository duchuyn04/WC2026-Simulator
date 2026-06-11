import fs from 'fs';

const wcData = JSON.parse(fs.readFileSync('./data/fifa-teams-squads.json', 'utf8'));
const espnData = JSON.parse(fs.readFileSync('./espn-teams-raw.json', 'utf8'));

const espnTeams = espnData.sports[0].leagues[0].teams.map(t => t.team);
const map = {};

for (const wcTeam of wcData.teams) {
  let matched = espnTeams.find(t => 
    t.abbreviation === wcTeam.code || 
    t.displayName.toLowerCase() === wcTeam.name.toLowerCase() ||
    t.name.toLowerCase() === wcTeam.name.toLowerCase()
  );
  if (matched) {
    map[wcTeam.id] = matched.id;
  } else {
    console.log(`Could not find ESPN match for ${wcTeam.name} (${wcTeam.code})`);
  }
}

const content = `export const ESPN_TEAM_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};`;
fs.writeFileSync('./src/lib/espn-mapping.ts', content);
console.log("Wrote src/lib/espn-mapping.ts");
