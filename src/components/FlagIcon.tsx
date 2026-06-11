import { flagUrl } from "@/lib/data";

const SIZES = {
  xs: "w-6 h-4",
  sm: "w-7 h-5",
  md: "w-9 h-6",
  lg: "w-11 h-8",
} as const;

type Props = {
  code: string;
  size?: keyof typeof SIZES;
  title?: string;
};

export function FlagIcon({ code, size = "sm", title }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center ${SIZES[size]} rounded-[3px] overflow-hidden bg-zinc-800 shrink-0 ring-1 ring-black/20`}
      title={title ?? code}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagUrl(code)}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover block"
        draggable={false}
      />
    </span>
  );
}