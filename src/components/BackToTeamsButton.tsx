"use client";

import { useRouter } from "next/navigation";

export function BackToTeamsButton() {
  const router = useRouter();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/teams");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex w-fit items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs font-semibold text-amber-400 backdrop-blur-md transition-all hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-300 sm:px-4 sm:py-2 sm:text-sm"
    >
      <span className="transition-transform group-hover:-translate-x-1">←</span>
      Đội tuyển
    </button>
  );
}
