"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PortraitImage } from "./PortraitImage";

type PortraitImageProps = Parameters<typeof PortraitImage>[0];

type Props = PortraitImageProps & {
  title: string;
  subtitle?: string;
};

export function PortraitLightbox({ src, alt, placeholderProps, title, subtitle }: Props) {
  const [open, setOpen] = useState(false);

  const modal = open ? (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/85 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ảnh lớn của ${title}`}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-[#0c0f14] shadow-2xl sm:max-h-[calc(100vh-3rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-zinc-100">{title}</h2>
            {subtitle && <p className="truncate text-xs font-semibold text-zinc-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-black text-zinc-300 transition hover:border-amber-500 hover:text-amber-300"
          >
            Đóng
          </button>
        </div>

        <div className="min-h-0 flex-1 bg-zinc-950 p-3">
          <div className="h-full overflow-hidden rounded-2xl bg-zinc-900 [&>div]:h-full [&>img]:h-full [&>img]:object-contain [&>img]:object-center">
            <PortraitImage src={src} alt={alt} placeholderProps={placeholderProps} />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block h-full w-full overflow-hidden rounded-[inherit] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-label={`Xem ảnh lớn của ${title}`}
      >
        <span className="block h-full w-full [&>div]:h-full [&>img]:h-full">
          <PortraitImage src={src} alt={alt} placeholderProps={placeholderProps} />
        </span>
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs font-black text-white shadow-lg shadow-black/30 transition-opacity sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:text-[10px] sm:opacity-0 sm:group-hover:opacity-100">
          <span className="sm:hidden">+</span>
          <span className="hidden sm:inline">Xem ảnh</span>
        </span>
      </button>

      {modal ? createPortal(modal, document.body) : null}
    </>
  );
}
