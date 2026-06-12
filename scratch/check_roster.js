const fs = require('fs');

fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=760414")
  .then(res => res.json())
  .then(data => {
    fs.writeFileSync('C:/Users/juven/.gemini/antigravity-ide/brain/250fede7-2220-44f2-ae18-744b2a5d61ed/scratch/event_760414_response.json', JSON.stringify(data, null, 2));
    if (!data.rosters) {
      console.log("No rosters key in data for 760414");
      return;
    }
    data.rosters.forEach(tr => {
      console.log(`\nTeam: ${tr.homeAway} (${tr.team?.id || 'no-id'})`);
      const starters = tr.roster.filter(p => p.starter);
      console.log(`Starters count: ${starters.length}`);
      starters.forEach(p => {
        console.log(`- ${p.athlete.displayName} (Jersey: ${p.jersey}): Position Abbreviation: "${p.position?.abbreviation}", Name: "${p.position?.name}", DisplayName: "${p.position?.displayName}"`);
      });
    });
  })
  .catch(err => console.error(err));
