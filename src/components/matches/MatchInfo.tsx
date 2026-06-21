import { formatMatchMeta } from "@/lib/fifa/match-meta";
import type { MatchScheduleFields } from "@/lib/fifa/match-meta";

type Props = MatchScheduleFields & {
  matchNumber: number;
  compact?: boolean;
};

export function MatchInfo({ date, stadium, city, matchNumber, compact }: Props) {
  const { vietnamTime, venue } = formatMatchMeta({ date, stadium, city });

  if (!vietnamTime && !venue) return null;

  if (compact) {
    return (
      <div className="flex items-start justify-between gap-2 text-sm leading-snug text-zinc-500">
        <div className="min-w-0 space-y-0.5">
          {vietnamTime && (
            <p>
              <span className="text-zinc-600">Giờ VN: </span>
              <span className="text-amber-400/90 font-medium">{vietnamTime}</span>
            </p>
          )}
          {venue && (
            <p className="truncate" title={venue}>
              <span className="text-zinc-600">Sân: </span>
              {venue}
            </p>
          )}
        </div>
        <span className="shrink-0 font-mono text-zinc-600 text-xs">#{matchNumber}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm leading-snug text-zinc-500 border-b border-zinc-800/60 pb-2 mb-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-zinc-600">#{matchNumber}</span>
        {vietnamTime && (
          <span className="text-amber-400/90 font-medium">{vietnamTime} (VN)</span>
        )}
      </div>
      {venue && (
        <p className="truncate" title={venue}>
          {venue}
        </p>
      )}
    </div>
  );
}