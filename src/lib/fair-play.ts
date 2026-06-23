import type { FairPlayData, MatchResult } from "./fifa/types";
import type { GroupData } from "./fifa/types";

/**
 * FIFA fair play score: higher = fewer cards = better.
 * Yellow card = -1, Red card = -3.
 */
export function calculateFairPlayScore(cards: FairPlayData): number {
  const score = -(cards.yellowCards * 1 + cards.redCards * 3);
  return score === 0 ? 0 : score;
}

/**
 * Aggregate fair play scores per team from match results.
 * Returns Record<teamId, fairPlayScore>.
 */
export function aggregateFairPlay(
  matchResults: Record<string, MatchResult>,
  groups: GroupData[]
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const group of groups) {
    for (const match of group.matches) {
      if (!match.home || !match.away) continue;
      const result = matchResults[match.id];
      if (!result) continue;

      const homeFP = result.homeFairPlay;
      const awayFP = result.awayFairPlay;

      if (homeFP) {
        const score = calculateFairPlayScore(homeFP);
        scores[match.home.id] = (scores[match.home.id] ?? 0) + score;
      }
      if (awayFP) {
        const score = calculateFairPlayScore(awayFP);
        scores[match.away.id] = (scores[match.away.id] ?? 0) + score;
      }
    }
  }

  return scores;
}
