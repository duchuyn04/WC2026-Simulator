"use client";

import { useMemo } from "react";
import { useSimulation } from "@/lib/store";
import { useKnockout } from "@/lib/hooks";
import { BracketTree } from "./BracketTree";
import { KnockoutSyncBanner } from "./KnockoutSyncBanner";
import type { ResolvedKnockoutMatch } from "@/lib/fifa/types";

export function KnockoutBracket() {
  const stages = useKnockout();
  const setKnockoutWinner = useSimulation((s) => s.setKnockoutWinner);

  const matches = useMemo(() => {
    const map = new Map<number, ResolvedKnockoutMatch>();
    for (const list of Object.values(stages)) {
      for (const match of list) {
        map.set(match.matchNumber, match);
      }
    }
    return map;
  }, [stages]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <KnockoutSyncBanner />
      <BracketTree
        matches={matches}
        onPickWinner={(matchNumber, teamId) => setKnockoutWinner(matchNumber, teamId)}
      />
    </div>
  );
}