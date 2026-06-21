"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { useRankChanges } from "@/lib/use-rank-changes";
import type { TeamStats } from "@/lib/fifa/types";

type Props = {
  ranked: TeamStats[];
  manual: boolean;
  onReorder: (teamIds: string[]) => void;
  onClearManual: () => void;
  highlightChanges?: boolean;
  hideStats?: boolean;
  compact?: boolean;
  size?: "md" | "lg";
  testId?: string;
};

function RankDelta({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className={[
        "shrink-0 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums",
        up ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400",
      ].join(" ")}
    >
      {up ? `↑${delta}` : `↓${Math.abs(delta)}`}
    </span>
  );
}

function SortableRow({
  stat,
  position,
  highlight,
  rankDelta,
  size,
  hideStats,
}: {
  stat: TeamStats;
  position: number;
  highlight: boolean;
  rankDelta: number;
  size: "md" | "lg";
  hideStats?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stat.team.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const medals = ["🥇", "🥈", "🥉", "4"];
  const large = size === "lg";

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`standing-row-${stat.team.code}`}
      className={[
        "flex items-center gap-1.5 sm:gap-2 rounded-lg border px-2 overflow-hidden transition-colors duration-500",
        large ? "py-2 sm:py-2.5" : "py-1.5",
        isDragging ? "border-amber-400 bg-zinc-800 z-10" : "border-transparent bg-zinc-900/40",
        highlight && rankDelta !== 0 ? "border-amber-400/60 bg-amber-500/15 ring-1 ring-amber-400/30" : "",
      ].join(" ")}
    >
      <button
        type="button"
        className="w-5 shrink-0 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 touch-none text-center"
        {...attributes}
        {...listeners}
        aria-label="Kéo để sắp xếp"
      >
        ⠿
      </button>
      <span
        className={`w-5 shrink-0 text-center ${large ? "text-base" : "text-sm"}`}
      >
        {medals[position] ?? position + 1}
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <TeamBadge team={stat.team} size={large ? "md" : "sm"} compact />
      </div>
      {!hideStats && (
        <div
          className={[
            "shrink-0 flex items-center font-mono tabular-nums text-zinc-400 whitespace-nowrap",
            large ? "text-sm sm:text-base gap-1.5 sm:gap-3" : "text-xs sm:text-sm gap-1.5 sm:gap-2",
          ].join(" ")}
        >
          {highlight && <RankDelta delta={rankDelta} />}
          <span title="Điểm" className={large ? "font-semibold text-zinc-200" : ""}>
            {stat.points}pts
          </span>
          <span title="Hiệu số" className="hidden min-[360px]:inline">
            {stat.gf}:{stat.ga}
          </span>
          <span title="GD">{stat.gd > 0 ? `+${stat.gd}` : stat.gd}</span>
        </div>
      )}
    </div>
  );
}

export function StandingsDnD({
  ranked,
  manual,
  onReorder,
  onClearManual,
  highlightChanges = false,
  hideStats = false,
  compact = false,
  size = "md",
  testId,
}: Props) {
  const rankDeltas = useRankChanges(ranked);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = ranked.map((r) => r.team.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"} data-testid={testId}>
      {!compact && (
        <>
          <div className="flex items-center justify-between">
            <h4
              className={[
                "font-semibold uppercase tracking-wider text-zinc-500",
                size === "lg" ? "text-base" : "text-sm",
              ].join(" ")}
            >
              Bảng xếp hạng
            </h4>
            {manual && (
              <button
                type="button"
                onClick={onClearManual}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Tính lại từ tỉ số
              </button>
            )}
          </div>
          {manual && (
            <p className="text-xs text-amber-400/80">Đang dùng thứ hạng thủ công (kéo thả)</p>
          )}
        </>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className={compact ? "space-y-1.5" : "space-y-1"}>
            {ranked.map((stat, i) => (
              <SortableRow
                key={stat.team.id}
                stat={stat}
                position={i}
                highlight={highlightChanges && !hideStats}
                rankDelta={rankDeltas.get(stat.team.id) ?? 0}
                size={size}
                hideStats={hideStats}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}