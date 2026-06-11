import { describe, it, expect } from "vitest";
import teamsData from "../../../../data/fifa-teams-squads.json";

function getTeamSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-and-/g, "-")
    .replace(/(^-|-$)+/g, "");
}

describe("Team Slugs", () => {
  it("should match 100% of all 48 team slugs in data file", () => {
    let matches = 0;
    const errors: string[] = [];

    teamsData.teams.forEach((team) => {
      const generated = getTeamSlug(team.name);
      if (generated === team.slug) {
        matches++;
      } else {
        errors.push(`Team "${team.name}": expected slug "${team.slug}", got "${generated}"`);
      }
    });

    if (errors.length > 0) {
      console.error(errors.join("\n"));
    }

    expect(matches).toBe(teamsData.teams.length);
    expect(errors).toHaveLength(0);
  });
});
