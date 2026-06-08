"use client";

import type { ReactNode } from "react";
import { getPodiumFromMatches } from "@/lib/fifa/podium";
import type { ResolvedKnockoutMatch, Team } from "@/lib/fifa/types";
import { FlagIcon } from "./FlagIcon";
import { BronzeMedalIcon, TrophyIcon } from "./BracketIcons";

type Props = {
  matches: Map<number, ResolvedKnockoutMatch>;
};

function PodiumRow({
  rank,
  label,
  team,
  accent,
  icon,
}: {
  rank: number;
  label: string;
  team: Team | null;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-zinc-800/80 bg-zinc-900/90 px-2 py-1">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accent}`}
      >
        {rank}
      </span>
      <span className="shrink-0 text-amber-400/90">{icon}</span>
      {team ? (
        <>
          <FlagIcon code={team.code} size="sm" title={team.name} />
          <span className="min-w-0 truncate text-xs font-medium text-zinc-100">{team.name}</span>
          <span className="shrink-0 text-xs text-zinc-500">{team.code}</span>
        </>
      ) : (
        <span className="text-sm text-zinc-500">{label}</span>
      )}
    </div>
  );
}

export function PodiumBoard({ matches }: Props) {
  const { champion, runnerUp, bronze } = getPodiumFromMatches(matches);
  const hasAny = !!(champion || runnerUp || bronze);

  return (
    <div className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 p-2 shadow-md backdrop-blur-sm">
      <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Bảng xếp hạng
      </p>
      <div className="space-y-1">
        <PodiumRow
          rank={1}
          label="Chờ chung kết"
          team={champion}
          accent="bg-amber-500 text-black"
          icon={<TrophyIcon size={16} className="text-amber-400" />}
        />
        <PodiumRow
          rank={2}
          label="Chờ chung kết"
          team={runnerUp}
          accent="bg-zinc-600 text-zinc-100"
          icon={<span className="text-xs font-bold text-zinc-300">🥈</span>}
        />
        <PodiumRow
          rank={3}
          label="Chờ tranh hạng 3"
          team={bronze}
          accent="bg-amber-700/80 text-amber-100"
          icon={<BronzeMedalIcon size={16} className="text-amber-600" />}
        />
      </div>
      {!hasAny && (
        <p className="mt-2 text-center text-[11px] text-zinc-600">
          Chọn người thắng để cập nhật
        </p>
      )}
    </div>
  );
}