const COMPETITION_ID = "17";
const SEASON_ID = "285023";
const LANGUAGE = "en";

function localizedValue(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const items = value as Array<{ Locale?: string; Description?: string }>;
  return items.find((item) => item.Locale === "en-GB")?.Description ?? items[0]?.Description ?? null;
}

export type SquadPlayer = {
  id: string;
  name: string | null;
  shortName: string | null;
  jerseyNumber: number | null;
  position: string | null;
  realPosition: string | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  countryCode: string | null;
  pictureUrl: string | null;
  pictureSource: "fifa" | null;
};

export function normalizeSquadPlayer(player: Record<string, unknown>): SquadPlayer {
  const playerPicture = (player.PlayerPicture as { PictureUrl?: string } | null) ?? null;
  const pictureUrl = playerPicture?.PictureUrl ?? (player.PictureUrl as string | undefined) ?? null;

  return {
    id: String(player.IdPlayer ?? ""),
    name: localizedValue(player.PlayerName),
    shortName: localizedValue(player.ShortName),
    jerseyNumber: typeof player.JerseyNum === "number" ? player.JerseyNum : null,
    position: localizedValue(player.PositionLocalized),
    realPosition: localizedValue(player.RealPositionLocalized),
    birthDate: typeof player.BirthDate === "string" ? player.BirthDate : null,
    heightCm: typeof player.Height === "number" ? player.Height : null,
    weightKg: typeof player.Weight === "number" ? player.Weight : null,
    countryCode: typeof player.IdCountry === "string" ? player.IdCountry : null,
    pictureUrl,
    pictureSource: pictureUrl ? "fifa" : null,
  };
}

export async function fetchTeamSquadFromFifa(teamId: string): Promise<SquadPlayer[] | null> {
  const url = `https://api.fifa.com/api/v3/teams/${teamId}/squad?idCompetition=${COMPETITION_ID}&idSeason=${SEASON_ID}&language=${LANGUAGE}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      console.warn(`Failed to fetch squad for team ${teamId}: ${response.status}`);
      return null;
    }
    const data = (await response.json()) as { Players?: Record<string, unknown>[] };
    return (data.Players ?? []).map(normalizeSquadPlayer);
  } catch (error) {
    console.warn(`Error fetching squad for team ${teamId}:`, error);
    return null;
  }
}
