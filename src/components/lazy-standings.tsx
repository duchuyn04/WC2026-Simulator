"use client";

import dynamic from "next/dynamic";

export const StandingsDnD = dynamic(
  () => import("./StandingsDnD").then((m) => m.StandingsDnD),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center text-sm text-zinc-600 animate-pulse px-3 py-4">
        Đang tải bảng xếp hạng...
      </div>
    ),
  },
);
