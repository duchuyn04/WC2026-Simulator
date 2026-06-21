type IconProps = {
  className?: string;
  size?: number;
};

export function TrophyIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M7 4h10v2a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V4Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M5 4H3v1a3 3 0 0 0 3 3M19 4h2v1a3 3 0 0 1-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 10v3M9 20h6M10 13h4v3H10v-3Z" fill="currentColor" />
      <path d="M8 20h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BronzeMedalIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="14" r="5.5" fill="currentColor" opacity="0.95" />
      <circle cx="12" cy="14" r="4" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <path
        d="M9.5 5.5 12 9l2.5-3.5M7 4h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="6"
        fontWeight="700"
        fill="#1a1208"
      >
        3
      </text>
    </svg>
  );
}