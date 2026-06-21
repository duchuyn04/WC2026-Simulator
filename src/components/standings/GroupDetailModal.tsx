"use client";

import { useEffect, useRef } from "react";
import { GroupPanel } from "./GroupPanel";
import type { GroupData, GroupStanding, MatchResult } from "@/lib/fifa/types";
import type { GroupInputMode } from "@/lib/store";

type Props = {
  open: boolean;
  onClose: () => void;
  group: GroupData;
  standing: GroupStanding;
  matchResults: Record<string, MatchResult>;
  inputMode: GroupInputMode;
  isManual: boolean;
  manualOrder: string[];
  onScore: (matchId: string, home?: number | null, away?: number | null) => void;
  onReorder: (teamIds: string[]) => void;
  onClearManual: () => void;
};

export function GroupDetailModal({
  open,
  onClose,
  group,
  standing,
  matchResults,
  inputMode,
  isManual,
  manualOrder,
  onScore,
  onReorder,
  onClearManual,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`group-detail-title-${group.letter}`}
        tabIndex={-1}
        data-testid={`group-detail-modal-${group.letter}`}
        className="relative z-10 flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-zinc-700 bg-[#0c0f14] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-gradient-to-r from-amber-600/25 to-transparent px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
              Chi tiết bảng
            </p>
            <h2
              id={`group-detail-title-${group.letter}`}
              className="text-2xl font-black tracking-tight"
            >
              Bảng {group.letter}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            aria-label="Đóng"
          >
            Đóng
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <GroupPanel
            group={group}
            standing={standing}
            matchResults={matchResults}
            inputMode={inputMode}
            isManual={isManual}
            manualOrder={manualOrder}
            onScore={onScore}
            onReorder={onReorder}
            onClearManual={onClearManual}
            variant="detail"
            highlightStandings
          />
        </div>
      </div>
    </div>
  );
}