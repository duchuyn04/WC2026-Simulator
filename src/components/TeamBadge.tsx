import type { Team } from "@/lib/fifa/types";
import { FlagIcon } from "./FlagIcon";

type Props = {
  team: Team | null;
  label?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  selected?: boolean;
  onClick?: () => void;
  /** Chỉ cờ + tên (ẩn mã) — dùng trong BXH hẹp */
  compact?: boolean;
};

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

const flagSizes = {
  sm: "sm" as const,
  md: "md" as const,
  lg: "lg" as const,
};

export function TeamBadge({
  team,
  label,
  size = "md",
  align = "left",
  selected,
  onClick,
  compact = false,
}: Props) {
  const text = textSizes[size];
  const flagSize = flagSizes[size];
  const clickable = !!onClick;

  if (!team) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-zinc-500 ${text} ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <span className="w-6 h-4 rounded-[3px] bg-zinc-800 shrink-0" />
        <span className="truncate">{label ?? "TBD"}</span>
      </span>
    );
  }

  const cls = [
    "inline-flex items-center gap-1.5 max-w-full min-w-0",
    align === "right" ? "flex-row-reverse" : "",
    text,
    clickable ? "cursor-pointer hover:bg-white/10 rounded-lg px-1.5 py-1 -mx-1.5" : "",
    selected ? "bg-amber-500/20 ring-1 ring-amber-400 rounded-lg px-1.5 py-1 -mx-1.5" : "",
  ].join(" ");

  const content = (
    <>
      <FlagIcon code={team.code} size={flagSize} title={team.name} />
      <span className="font-medium truncate min-w-0" title={team.name}>
        {team.name}
      </span>
      {!compact && (
        <span className="text-zinc-500 shrink-0 tabular-nums">{team.code}</span>
      )}
    </>
  );

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {content}
      </button>
    );
  }

  return <span className={cls}>{content}</span>;
}