"use client";

import Link from "next/link";
import { useSimulation } from "@/lib/store";

export function TeamsHeader() {
  const setActiveTab = useSimulation((state) => state.setActiveTab);
  const resetAll = useSimulation((state) => state.resetAll);

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-zinc-800 bg-[#0c0f14]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">
              FIFA World Cup
            </p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              WC 2026 Simulator
            </h1>
            <p className="mt-0.5 text-base text-zinc-500">
              Xem đội tuyển · Lọc liên đoàn · Mở hồ sơ cầu thủ
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
              <Link
                href="/"
                onClick={() => setActiveTab("groups")}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 sm:px-4"
              >
                Mô phỏng
              </Link>
              <Link
                href="/"
                onClick={() => setActiveTab("schedule")}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 sm:px-4"
              >
                Lịch thi đấu & Yêu thích
              </Link>
              <Link
                href="/teams"
                className="rounded-md bg-[#6a041f] px-3 py-1.5 text-sm font-medium text-white transition-colors sm:px-4"
              >
                Đội tuyển
              </Link>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm("Xóa toàn bộ kịch bản?")) resetAll();
              }}
              className="rounded-lg border border-red-900/50 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-950/50"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
