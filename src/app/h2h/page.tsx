import React from "react";
import { H2HClient } from "./H2HClient";

export const revalidate = 60; // Cache for 60 seconds

function pickLocalizedName(values: any[], fallback = "") {
  if (!Array.isArray(values)) return fallback;
  return (
    values.find((value) => value?.Locale === "en-GB")?.Description ??
    values.find((value) => value?.Description)?.Description ??
    fallback
  );
}

export default async function H2HPage() {
  let matches = [];
  try {
    const res = await fetch(
      "https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023",
      { next: { revalidate: 60 } }
    );
    if (res.ok) {
      const data = await res.json();
      matches = data.Results || [];
    }
  } catch (err) {
    console.error("Failed to fetch matches:", err);
  }

  // Extract unique teams
  const teamMap = new Map<string, string>();
  for (const match of matches) {
    if (match.HomeTeam?.IdTeam && match.HomeTeam?.TeamName) {
      const name = pickLocalizedName(match.HomeTeam.TeamName, String(match.HomeTeam.IdTeam));
      teamMap.set(String(match.HomeTeam.IdTeam), name);
    }
    if (match.AwayTeam?.IdTeam && match.AwayTeam?.TeamName) {
      const name = pickLocalizedName(match.AwayTeam.TeamName, String(match.AwayTeam.IdTeam));
      teamMap.set(String(match.AwayTeam.IdTeam), name);
    }
  }

  const teams = Array.from(teamMap.entries()).map(([id, name]) => ({ id, name }));
  teams.sort((a, b) => a.name.localeCompare(b.name));

  return <H2HClient teams={teams} matches={matches} />;
}
