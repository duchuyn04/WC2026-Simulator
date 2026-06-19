"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function FloatingBackButton() {
  const [show, setShow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 260);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/teams");
    }
  };

  return (
    <div
      className={`fixed left-3 top-3 z-50 transition-all duration-300 sm:left-4 sm:top-4 ${
        show ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={handleBack}
        className="flex size-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 text-lg text-amber-400 shadow-xl backdrop-blur-md transition-all hover:border-amber-500 hover:bg-zinc-800 hover:text-amber-300 sm:size-11 sm:text-xl"
        aria-label="Quay lại trang trước"
      >
        ←
      </button>
    </div>
  );
}
