"use client";

import { useMemo } from "react";
import { seed } from "@/lib/data";
import type { ResolvedKnockoutMatch } from "@/lib/fifa/types";
import type { ScheduleEntry } from "@/lib/schedule";
import { BracketTree } from "./BracketTree";

type Props = {
  entries: ScheduleEntry[];
};

export function RealBracket({ entries }: Props) {
  const matches = useMemo(() => {
    const entriesByNumber = new Map(
      entries
        .filter((entry) => entry.kind === "knockout")
        .map((entry) => [entry.matchNumber, entry]),
    );

    return new Map<number, ResolvedKnockoutMatch>(
      seed.knockout.map((match) => {
        const entry = entriesByNumber.get(match.matchNumber);
        return [
          match.matchNumber,
          {
            ...match,
            resolvedHome: entry?.home
              ? { team: entry.home, label: entry.homePlaceholder }
              : null,
            resolvedAway: entry?.away
              ? { team: entry.away, label: entry.awayPlaceholder }
              : null,
            winner: entry?.winner ?? null,
          },
        ];
      }),
    );
  }, [entries]);

  return (
    <div
      data-testid="real-bracket"
      className="relative left-1/2 mt-8 flex h-[calc(100dvh-var(--navbar-height,0px)+19px)] min-h-0 w-screen -translate-x-1/2 flex-col px-2 sm:px-3"
    >
      <BracketTree matches={matches} />
    </div>
  );
}
