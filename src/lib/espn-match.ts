import type { ScheduleEntry } from "./schedule";

export type EspnScoreboardMatch = {
  id: string;
  date: string;
  status: string;
  state: "pre" | "in" | "post";
  shortDetail: string;
  homeId?: string;
  awayId?: string;
  homeScore?: string;
  awayScore?: string;
};

type EspnScoreboardResponse = {
  events?: Array<{
    id?: string;
    date?: string;
    competitions?: Array<{
      status?: {
        type?: {
          name?: string;
          state?: "pre" | "in" | "post";
          shortDetail?: string;
        };
      };
      competitors?: Array<{
        homeAway?: "home" | "away";
        score?: string;
        team?: { id?: string };
      }>;
    }>;
  }>;
};

export function parseEspnScoreboard(data: EspnScoreboardResponse): EspnScoreboardMatch[] {
  return (data.events ?? []).flatMap((event) => {
    const competition = event.competitions?.[0];
    const home = competition?.competitors?.find((team) => team.homeAway === "home");
    const away = competition?.competitors?.find((team) => team.homeAway === "away");

    if (!event.id || !event.date || !competition) return [];

    return [{
      id: event.id,
      date: event.date,
      status: competition.status?.type?.name ?? "",
      state: competition.status?.type?.state ?? "pre",
      shortDetail: competition.status?.type?.shortDetail ?? "",
      homeId: home?.team?.id,
      awayId: away?.team?.id,
      homeScore: home?.score,
      awayScore: away?.score,
    }];
  });
}

export function findEspnMatch(
  entry: ScheduleEntry,
  matches: EspnScoreboardMatch[],
  espnToLocal: Record<string, string>
): EspnScoreboardMatch | undefined {
  if (!entry.date) return undefined;

  const entryTime = new Date(entry.date).getTime();
  if (Number.isNaN(entryTime)) return undefined;

  const sameKickoff = matches.filter((match) => {
    const matchTime = new Date(match.date).getTime();
    return !Number.isNaN(matchTime) && matchTime === entryTime;
  });

  if (sameKickoff.length === 1) return sameKickoff[0];
  if (!entry.home?.id || !entry.away?.id) return undefined;

  return sameKickoff.find((match) => {
    const espnHome = match.homeId ? espnToLocal[match.homeId] : undefined;
    const espnAway = match.awayId ? espnToLocal[match.awayId] : undefined;

    return (
      (espnHome === entry.home?.id && espnAway === entry.away?.id) ||
      (espnHome === entry.away?.id && espnAway === entry.home?.id)
    );
  });
}
