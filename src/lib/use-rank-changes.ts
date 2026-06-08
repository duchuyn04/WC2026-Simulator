"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TeamStats } from "./fifa/types";

export const RANK_HIGHLIGHT_MS = 1400;

/** Chỉ theo dõi thứ tự hạng — tránh re-run khi điểm/hiệu số đổi mà hạng không đổi. */
export function rankOrderKey(ranked: TeamStats[]) {
  return ranked.map((s) => s.team.id).join("|");
}

export function detectRankDeltas(
  ranked: TeamStats[],
  prev: Map<string, number>,
  seeded: boolean
): { next: Map<string, number>; deltas: Map<string, number> } {
  const next = new Map<string, number>();
  const deltas = new Map<string, number>();

  ranked.forEach((stat, index) => {
    const old = prev.get(stat.team.id);
    if (seeded && old !== undefined && old !== index) {
      deltas.set(stat.team.id, old - index);
    }
    next.set(stat.team.id, index);
  });

  return { next, deltas };
}

/** Theo dõi đội nào vừa đổi hạng (để highlight tạm thời). */
export function useRankChanges(ranked: TeamStats[]) {
  const prevRef = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Map<string, number>>(new Map());
  const seeded = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderKey = useMemo(() => rankOrderKey(ranked), [ranked]);

  useEffect(() => {
    const { next, deltas: newDeltas } = detectRankDeltas(ranked, prevRef.current, seeded.current);
    prevRef.current = next;

    if (!seeded.current) {
      seeded.current = true;
      return;
    }

    if (newDeltas.size === 0) return;

    setDeltas(newDeltas);

    if (clearTimerRef.current !== null) {
      clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = setTimeout(() => {
      setDeltas(new Map());
      clearTimerRef.current = null;
    }, RANK_HIGHLIGHT_MS);
  }, [orderKey, ranked]);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  return deltas;
}