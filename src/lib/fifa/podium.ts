import type { ResolvedKnockoutMatch, Team } from "./types";

export type PodiumResult = {
  champion: Team | null;
  runnerUp: Team | null;
  bronze: Team | null;
};

export function getPodiumFromMatches(
  matches: Map<number, ResolvedKnockoutMatch>
): PodiumResult {
  const final = matches.get(104);
  const third = matches.get(103);

  let champion: Team | null = null;
  let runnerUp: Team | null = null;
  let bronze: Team | null = third?.winner ?? null;

  if (final?.winner) {
    champion = final.winner;
    const home = final.resolvedHome?.team ?? null;
    const away = final.resolvedAway?.team ?? null;
    runnerUp =
      home && away
        ? home.id === champion.id
          ? away
          : home
        : null;
  }

  return { champion, runnerUp, bronze };
}