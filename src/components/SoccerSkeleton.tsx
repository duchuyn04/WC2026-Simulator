import React from "react";

interface SoccerSkeletonProps {
  variant: "standings" | "stats" | "match-detail";
}

// Bouncing soccer ball visual indicator
function LoadingSoccerBall() {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="relative flex flex-col items-center">
        {/* Soccer ball SVG */}
        <svg
          className="w-12 h-12 text-zinc-100 animate-soccer-bounce filter drop-shadow-md"
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="256" cy="256" r="240" fill="#ffffff" stroke="#18181b" strokeWidth="16" />
          <polygon points="256,190 318,235 294,308 218,308 194,235" fill="#18181b" />
          <line x1="256" y1="190" x2="256" y2="70" stroke="#18181b" strokeWidth="16" />
          <line x1="318" y1="235" x2="430" y2="200" stroke="#18181b" strokeWidth="16" />
          <line x1="294" y1="308" x2="364" y2="410" stroke="#18181b" strokeWidth="16" />
          <line x1="218" y1="308" x2="148" y2="410" stroke="#18181b" strokeWidth="16" />
          <line x1="194" y1="235" x2="82" y2="200" stroke="#18181b" strokeWidth="16" />
          <polygon points="256,70 200,110 215,140 297,140 312,110" fill="#18181b" />
          <polygon points="430,200 460,260 410,290 375,260 380,215" fill="#18181b" />
          <polygon points="364,410 320,442 270,410 280,365 330,365" fill="#18181b" />
          <polygon points="148,410 192,442 242,410 232,365 182,365" fill="#18181b" />
          <polygon points="82,200 52,260 102,290 137,260 132,215" fill="#18181b" />
        </svg>
        {/* Soft shadow that pulses/scales with the ball height */}
        <div className="w-8 h-1.5 bg-black/40 rounded-full mt-2 animate-soccer-shadow"></div>
      </div>
    </div>
  );
}

export default function SoccerSkeleton({ variant }: SoccerSkeletonProps) {
  if (variant === "standings") {
    return (
      <div className="space-y-6">
        <LoadingSoccerBall />
        
        {/* Standings Grid Skeleton */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, groupIdx) => (
            <div
              key={groupIdx}
              className="flex flex-col border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden shadow-lg"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between border-b border-zinc-700/50 bg-zinc-800/80 px-4 py-2.5">
                <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
              </div>
              {/* Group Table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400 text-xs">
                    <th className="px-3 py-2 text-left font-normal">Đội</th>
                    <th className="px-2 py-2 text-center font-normal">P</th>
                    <th className="px-2 py-2 text-center font-normal">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-zinc-800/50">
                      <td className="px-3 py-3 flex items-center gap-2">
                        <div className="w-5 h-4 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="h-4 w-6 bg-zinc-800 rounded mx-auto animate-pulse" />
                      </td>
                      <td className="px-2 py-3 text-center font-bold">
                        <div className="h-4 w-8 bg-zinc-800 rounded mx-auto animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div className="space-y-6">
        <LoadingSoccerBall />
        
        {/* Team Stats Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
          <div className="border border-zinc-800 rounded-xl bg-zinc-900/40 p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="w-full h-8 bg-zinc-800/60 rounded-lg overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full bg-[#6a041f]/40 w-[60%] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "match-detail") {
    return (
      <div className="space-y-6">
        <LoadingSoccerBall />

        {/* Score Header Skeleton */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <div className="flex justify-between items-center gap-4 py-4">
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-12 h-12 bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-12 h-12 bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Detailed Stats Rows Skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-zinc-500">
                  <div className="h-3.5 w-8 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3.5 w-24 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3.5 w-8 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 h-3">
                  <div className="flex-1 bg-zinc-800 rounded-full h-full overflow-hidden flex justify-end">
                    <div className="bg-[#6a041f]/50 w-[50%] h-full animate-pulse" />
                  </div>
                  <div className="flex-1 bg-zinc-800 rounded-full h-full overflow-hidden">
                    <div className="bg-emerald-600/50 w-[50%] h-full animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
