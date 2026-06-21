"use client";

import React, { useEffect, useMemo, useState } from "react";
import { H2HSummary } from "./H2HSummary";
import { fetchH2HMatches, getLocalizedText, type FifaMatch } from "@/lib/h2h-data";
import { getH2HStats } from "@/lib/h2h-stats";

interface H2HModalProps {
  teamA: { id: string; name: string; flagUrl: string } | null;
  teamB: { id: string; name: string; flagUrl: string } | null;
  onClose: () => void;
}

export function H2HModal({ teamA, teamB, onClose }: H2HModalProps) {
  const [matches, setMatches] = useState<FifaMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamA || !teamB) return;
    Promise.resolve().then(() => {
      setMatches(null);
      setError(null);
    });
    let mounted = true;
    fetchH2HMatches(teamA.id, teamB.id)
      .then((data) => {
        if (mounted) setMatches(data);
      })
      .catch(() => {
        if (mounted) setError("Không thể tải dữ liệu lịch sử đối đầu");
      });
    return () => {
      mounted = false;
    };
  }, [teamA, teamB]);

  useEffect(() => {
    if (!teamA || !teamB) return;
    const prev = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [teamA, teamB, onClose]);

  if (!teamA || !teamB) return null;

  const stats = matches
    ? getH2HStats(matches, teamA.id, teamB.id)
    : { total: 0, winsA: 0, draws: 0, winsB: 0 };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="h2h-title"
        aria-modal="true"
        role="dialog"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0c0f14] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-3 sm:px-6">
          <div>
            <h2 id="h2h-title" className="text-base font-black text-white sm:text-lg">
              Lịch sử đối đầu
            </h2>
            <p className="text-xs text-zinc-500">Tất cả giải đấu (1908–nay)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xl text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <img
                src={teamA.flagUrl}
                alt=""
                className="h-10 w-10 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-sm font-bold text-white">{teamA.name}</span>
            </div>
            <div className="text-lg font-black text-zinc-500 tracking-widest select-none">VS</div>
            <div className="flex flex-col items-center gap-2 text-center">
              <img
                src={teamB.flagUrl}
                alt=""
                className="h-10 w-10 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-sm font-bold text-white">{teamB.name}</span>
            </div>
          </div>

          {error ? (
            <div className="flex h-32 items-center justify-center">
              <p className="font-semibold text-rose-400">{error}</p>
            </div>
          ) : !matches ? (
            <div className="flex h-32 flex-col items-center justify-center gap-3 text-sm text-zinc-500">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500" />
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              <H2HSummary teamAId={teamA.id} teamBId={teamB.id} stats={stats} />

              <div className="mt-6 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Danh sách trận đấu
                </h3>
                <div className="divide-y divide-zinc-800/60">
                  {[...matches]
                    .sort((a, b) => {
                      const da = a.Date ? new Date(a.Date).getTime() : 0;
                      const db = b.Date ? new Date(b.Date).getTime() : 0;
                      return db - da;
                    })
                    .map((m) => {
                      const homeId = String(m.Home?.IdTeam ?? "");
                      const awayId = String(m.Away?.IdTeam ?? "");
                      const homeScore = m.HomeTeamScore != null && m.HomeTeamScore !== "" ? Number(m.HomeTeamScore) : null;
                      const awayScore = m.AwayTeamScore != null && m.AwayTeamScore !== "" ? Number(m.AwayTeamScore) : null;
                      const isAHome = homeId === teamA.id;
                      const isBHome = homeId === teamB.id;
                      const date = m.Date
                        ? new Date(m.Date).toLocaleDateString("vi-VN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "";
                      const competition = getLocalizedText(m.CompetitionName);
                      const homeAbbr = m.Home?.Abbreviation || homeId;
                      const awayAbbr = m.Away?.Abbreviation || awayId;

                      return (
                        <div
                          key={String(m.IdMatch ?? `${homeId}-${awayId}-${m.Date}`)}
                          className="grid grid-cols-[7rem_1fr_auto] gap-2 py-2 text-xs"
                        >
                          <span className="text-zinc-500">{date}</span>
                          <span className="truncate text-zinc-400">{competition}</span>
                          <span className="tabular-nums whitespace-nowrap font-semibold">
                            <span className={isAHome ? "text-emerald-400" : "text-zinc-300"}>
                              {homeAbbr} {homeScore != null ? homeScore : "?"}
                            </span>
                            <span className="mx-1 text-zinc-600">–</span>
                            <span className={isBHome ? "text-emerald-400" : "text-zinc-300"}>
                              {awayScore != null ? awayScore : "?"} {awayAbbr}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
