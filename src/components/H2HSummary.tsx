"use client";

import React from "react";

interface H2HSummaryProps {
  teamAId: string;
  teamBId: string;
  stats: { total: number; winsA: number; draws: number; winsB: number };
}

export function H2HSummary({ teamAId, teamBId, stats }: H2HSummaryProps) {
  if (teamAId === teamBId) {
    return <p className="text-zinc-500 text-center py-4">Vui lòng chọn hai đội khác nhau.</p>;
  }
  if (stats.total === 0) {
    return <p className="text-zinc-500 text-center py-4">Chưa có dữ liệu đối đầu.</p>;
  }

  const pctA = (stats.winsA / stats.total) * 100;
  const pctDraw = (stats.draws / stats.total) * 100;
  const pctB = (stats.winsB / stats.total) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto bg-zinc-900 rounded-xl p-6 border border-zinc-800">
      <h3 className="text-center font-bold text-zinc-100 mb-6">Tổng số trận: {stats.total}</h3>
      <div className="flex h-4 w-full rounded-full overflow-hidden mb-4">
        <div style={{ width: `${pctA}%` }} className="bg-emerald-500 transition-all" />
        <div style={{ width: `${pctDraw}%` }} className="bg-zinc-500 transition-all" />
        <div style={{ width: `${pctB}%` }} className="bg-rose-500 transition-all" />
      </div>
      <div className="flex justify-between text-sm font-semibold">
        <span className="text-emerald-400">{stats.winsA} Thắng</span>
        <span className="text-zinc-400">{stats.draws} Hòa</span>
        <span className="text-rose-400">{stats.winsB} Thắng</span>
      </div>
    </div>
  );
}
