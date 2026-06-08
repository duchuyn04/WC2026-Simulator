"use client";

import { TeamBadge } from "./TeamBadge";
import type { TeamStats } from "@/lib/fifa/types";

type Props = {
  ranked: TeamStats[];
  size?: "md" | "lg";
  hideStats?: boolean;
};

export function StandingsPreview({ ranked, size = "md", hideStats = false }: Props) {
  const medals = ["🥇", "🥈", "🥉", "4"];
  const large = size === "lg";

  return (
    <div className="space-y-2" data-testid="standings-preview">
      <h4
        className={[
          "font-semibold uppercase tracking-wider text-zinc-500",
          large ? "text-base" : "text-sm",
        ].join(" ")}
      >
        Bảng xếp hạng
      </h4>
      <div className="space-y-1">
        {ranked.map((stat, i) => (
          <div
            key={stat.team.id}
            data-testid={`standing-preview-${stat.team.code}`}
            className={[
              "flex items-center gap-2 rounded-lg border border-transparent bg-zinc-900/40 px-2",
              large ? "py-2" : "py-1.5",
            ].join(" ")}
          >
            <span className={`w-5 shrink-0 text-center ${large ? "text-base" : "text-sm"}`}>
              {medals[i]}
            </span>
            <div className="min-w-0 flex-1">
              <TeamBadge team={stat.team} size={large ? "md" : "sm"} compact />
            </div>
            {!hideStats && (
              <span className="shrink-0 font-mono text-xs text-zinc-500 tabular-nums">
                {stat.points}pts
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}