"use client";

import { useState } from "react";

export function initialsFromName(name?: string | null) {
  if (!name) return "?";
  const words = name
    .replace(/\(.+?\)/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1]?.[0] : words[0]?.[1] ?? "";
  return `${first}${last}`.toUpperCase();
}

export function PortraitPlaceholder({
  badge,
  label,
  name,
  teamCode,
  primaryColor,
  secondaryColor,
}: {
  badge: string;
  label: string;
  name?: string | null;
  teamCode: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}) {
  const primary = primaryColor ?? "#6a041f";
  const secondary = secondaryColor ?? "#f59e0b";

  return (
    <div
      className="relative flex h-56 w-full flex-col justify-between overflow-hidden p-5 sm:h-64"
      style={{
        background: `radial-gradient(circle at 28% 18%, ${secondary}55, transparent 28%), linear-gradient(145deg, ${primary}dd, #151923 54%, #090b10)`,
      }}
    >
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/10" />
      <div className="absolute -bottom-16 -left-14 h-44 w-44 rounded-full bg-white/5" />
      <div className="relative flex items-center justify-between text-xs font-black uppercase tracking-[0.22em] text-white/60">
        <span>{teamCode}</span>
        <span>No image</span>
      </div>
      <div className="relative text-center">
        <p className="text-6xl font-black tracking-tight text-white drop-shadow-lg sm:text-7xl">
          {badge}
        </p>
        <p className="mt-4 text-3xl font-black text-white/85">{initialsFromName(name)}</p>
      </div>
      <p className="relative text-center text-xs font-bold uppercase tracking-[0.2em] text-white/55">
        {label}
      </p>
    </div>
  );
}

export function PortraitImage({
  src,
  alt,
  placeholderProps,
}: {
  src?: string | null;
  alt: string;
  placeholderProps: Parameters<typeof PortraitPlaceholder>[0];
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <PortraitPlaceholder {...placeholderProps} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-56 w-full object-cover object-top sm:h-64"
      onError={() => setError(true)}
    />
  );
}
