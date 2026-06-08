"use client";

import { FlagIcon } from "./FlagIcon";
import { MatchInfo } from "./MatchInfo";
import type { GroupMatch, MatchResult, Team } from "@/lib/fifa/types";

type ScorePatch = number | null;

type Props = {
  match: GroupMatch;
  result?: MatchResult;
  onChange: (home?: ScorePatch, away?: ScorePatch) => void;
};

/** null = xóa ô (trở về "-"), number = đặt tỉ số */
function parseScore(value: string): ScorePatch {
  if (value === "") return null;
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0) return 0;
  return Math.min(n, 99);
}

function bumpScore(current: number | undefined, delta: number): ScorePatch {
  if (delta < 0 && (current === undefined || current === 0)) return null;
  const base = current ?? 0;
  return Math.max(0, Math.min(99, base + delta));
}

function MatchTeam({ team, side }: { team: Team | null; side: "home" | "away" }) {
  if (!team) {
    return (
      <span
        className={`text-sm text-zinc-600 font-medium ${side === "away" ? "text-right block" : ""}`}
      >
        TBD
      </span>
    );
  }

  if (side === "home") {
    return (
      <div className="flex items-center gap-2 min-w-0" title={team.name}>
        <FlagIcon code={team.code} size="sm" title={team.name} />
        <span className="text-sm font-semibold truncate leading-none">{team.code}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0 justify-end" title={team.name}>
      <span className="text-sm font-semibold truncate leading-none">{team.code}</span>
      <FlagIcon code={team.code} size="sm" title={team.name} />
    </div>
  );
}

type ScoreFieldProps = {
  value: number | undefined;
  onChange: (value: ScorePatch) => void;
};

function ScoreField({ value, onChange }: ScoreFieldProps) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      step={1}
      value={value ?? ""}
      placeholder="-"
      onChange={(e) => onChange(parseScore(e.target.value))}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onChange(bumpScore(value, 1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onChange(bumpScore(value, -1));
        } else if (e.key === "Backspace" || e.key === "Delete") {
          if (value !== undefined) {
            e.preventDefault();
            onChange(null);
          }
        }
      }}
      className="w-9 h-9 text-center rounded bg-zinc-800 border border-zinc-700 text-base font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 p-0 [appearance:textfield]"
    />
  );
}

export function ScoreInput({ match, result, onChange }: Props) {
  const home = result?.home;
  const away = result?.away;

  return (
    <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 overflow-hidden">
      <div className="px-2.5 pt-2">
        <MatchInfo
          date={match.date}
          stadium={match.stadium}
          city={match.city}
          matchNumber={match.matchNumber}
          compact
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1.5 sm:gap-x-2 py-2 px-2 sm:px-2.5">
        <MatchTeam team={match.home} side="home" />

        <div className="flex items-center justify-center gap-1">
          <ScoreField value={home} onChange={(v) => onChange(v, undefined)} />
          <span className="text-zinc-600 text-sm select-none">:</span>
          <ScoreField value={away} onChange={(v) => onChange(undefined, v)} />
        </div>

        <MatchTeam team={match.away} side="away" />
      </div>
    </div>
  );
}