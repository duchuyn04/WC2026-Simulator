"use client";

import { useSimulation, type GroupInputMode } from "@/lib/store";

const MODES: { id: GroupInputMode; label: string; short: string }[] = [
  { id: "scores", label: "Nhập tỉ số", short: "Tỉ số" },
  { id: "ranks", label: "Chọn thứ hạng", short: "Thứ hạng" },
];

export function GroupInputModeToggle() {
  const mode = useSimulation((s) => s.groupInputMode);
  const setGroupInputMode = useSimulation((s) => s.setGroupInputMode);

  return (
    <div
      className="flex w-full sm:w-fit gap-0.5 p-1 rounded-lg bg-zinc-900/80 border border-zinc-800"
      role="group"
      aria-label="Chế độ vòng bảng"
      data-testid="group-input-mode-toggle"
    >
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          data-testid={`group-mode-${item.id}`}
          onClick={() => setGroupInputMode(item.id)}
          className={[
            "flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap",
            mode === item.id
              ? "bg-amber-500 text-black"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
          ].join(" ")}
        >
          <span className="sm:hidden">{item.short}</span>
          <span className="hidden sm:inline">{item.label}</span>
        </button>
      ))}
    </div>
  );
}