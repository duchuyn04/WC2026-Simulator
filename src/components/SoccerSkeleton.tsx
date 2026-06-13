import React from "react";

interface SoccerSkeletonProps {
  variant: "standings" | "stats" | "match-detail";
}

export default function SoccerSkeleton({ variant }: SoccerSkeletonProps) {
  // Customize padding based on where the loader is rendered
  const paddingClass =
    variant === "standings" ? "py-28 sm:py-36" :
    variant === "match-detail" ? "py-20" : "py-10";

  return (
    <div className={`flex flex-col items-center justify-center w-full ${paddingClass}`}>
      <div className="relative flex flex-col items-center">
        {/* Soccer ball SVG */}
        <svg
          className="w-12 h-12 animate-soccer-bounce filter drop-shadow-md"
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
