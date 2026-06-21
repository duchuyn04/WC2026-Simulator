"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
import type { Team } from "@/lib/fifa/types";

export type SortableTeamRow = {
  id: string;
  team: Team;
  subtitle?: string;
  qualified?: boolean;
};

type RowVisualProps = {
  row: SortableTeamRow;
  positionLabel: string;
  size: "md" | "lg";
  isDragging?: boolean;
  isOverlay?: boolean;
  dragHandle?: React.HTMLAttributes<HTMLButtonElement>;
};

function TeamRowVisual({
  row,
  positionLabel,
  size,
  isDragging,
  isOverlay,
  dragHandle,
}: RowVisualProps) {
  const large = size === "lg";

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-lg border px-2 transition-[box-shadow,background-color,border-color,opacity,transform] duration-200",
        large ? "py-2.5" : "py-2",
        isOverlay
          ? "border-amber-400 bg-zinc-800 shadow-2xl ring-2 ring-amber-400/30 scale-[1.03]"
          : isDragging
            ? "border-amber-400/40 bg-zinc-800/60 opacity-35"
            : row.qualified === false
              ? "border-zinc-800 bg-zinc-900/40 opacity-75"
              : row.qualified
                ? "border-emerald-800/50 bg-emerald-950/40"
                : "border-transparent bg-zinc-900/40 hover:bg-zinc-900/70",
      ].join(" ")}
    >
      <button
        type="button"
        className="w-6 shrink-0 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-amber-300 touch-none text-center transition-colors"
        aria-label="Kéo để sắp xếp"
        {...dragHandle}
      >
        ⠿
      </button>
      <span
        className={[
          "w-6 shrink-0 text-center font-bold tabular-nums",
          large ? "text-base" : "text-sm",
          row.qualified === false
            ? "text-zinc-500"
            : row.qualified
              ? "text-emerald-400"
              : "text-amber-400/90",
        ].join(" ")}
      >
        {positionLabel}
      </span>
      <div className="min-w-0 flex-1">
        <TeamBadge team={row.team} size={large ? "md" : "sm"} compact />
      </div>
      {row.subtitle && (
        <span className="shrink-0 text-xs font-mono text-zinc-500 tabular-nums">{row.subtitle}</span>
      )}
    </div>
  );
}

function SortableTeamRowItem({
  row,
  positionLabel,
  size,
}: {
  row: SortableTeamRow;
  positionLabel: string;
  size: "md" | "lg";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging
      ? undefined
      : transition ?? "transform 280ms cubic-bezier(0.25, 1, 0.5, 1)",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`sortable-team-${row.team.code}`}
      className="will-change-transform"
    >
      <TeamRowVisual
        row={row}
        positionLabel={positionLabel}
        size={size}
        isDragging={isDragging}
        dragHandle={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

type Props = {
  rows: SortableTeamRow[];
  onReorder: (ids: string[]) => void;
  positionLabels?: (index: number) => string;
  size?: "md" | "lg";
  title?: string;
  hint?: string;
  manual?: boolean;
  onClearManual?: () => void;
  clearLabel?: string;
  testId?: string;
};

export function SortableTeamList({
  rows,
  onReorder,
  positionLabels,
  size = "md",
  title,
  hint,
  manual,
  onClearManual,
  clearLabel = "Tính lại tự động",
  testId = "sortable-team-list",
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = rows.map((row) => row.id);
  const activeRow = rows.find((row) => row.id === activeId);
  const labelAt = positionLabels ?? ((index: number) => String(index + 1));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <div className="space-y-2" data-testid={testId}>
      {(title || (manual && onClearManual)) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <h4
              className={[
                "font-semibold uppercase tracking-wider text-zinc-500",
                size === "lg" ? "text-base" : "text-sm",
              ].join(" ")}
            >
              {title}
            </h4>
          )}
          {manual && onClearManual && (
            <button
              type="button"
              onClick={onClearManual}
              className="text-xs text-amber-400 hover:text-amber-300 shrink-0"
            >
              {clearLabel}
            </button>
          )}
        </div>
      )}
      {hint && <p className="text-xs text-amber-400/80">{hint}</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {rows.map((row, index) => (
              <SortableTeamRowItem
                key={row.id}
                row={row}
                positionLabel={labelAt(index)}
                size={size}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{
            duration: 240,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          {activeRow ? (
            <TeamRowVisual
              row={activeRow}
              positionLabel={labelAt(ids.indexOf(activeRow.id))}
              size={size}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}