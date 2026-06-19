"use client";

import { useEffect, useRef } from "react";
import { useSimulation } from "./store";
import { useStoreHydrated } from "./hooks";
import type { ScrollableTabId, TabId } from "./tabs";

export function usePersistedScroll(activeTab: TabId) {
  const hydrated = useStoreHydrated();
  const scrollPositions = useSimulation((s) => s.scrollPositions);
  const setScrollPosition = useSimulation((s) => s.setScrollPosition);
  const prevTabRef = useRef<TabId | null>(null);
  const didInitialRestore = useRef(false);

  useEffect(() => {
    if (!hydrated) return;

    if (!didInitialRestore.current) {
      didInitialRestore.current = true;
      if (activeTab === "knockout") {
        window.scrollTo(0, 0);
      } else {
        requestAnimationFrame(() =>
          window.scrollTo({ top: scrollPositions[activeTab] ?? 0, behavior: "instant" })
        );
      }
      prevTabRef.current = activeTab;
      return;
    }

    if (prevTabRef.current === activeTab) return;

    if (activeTab === "knockout") {
      window.scrollTo(0, 0);
    } else {
      requestAnimationFrame(() =>
        window.scrollTo({ top: scrollPositions[activeTab] ?? 0, behavior: "instant" })
      );
    }
    prevTabRef.current = activeTab;
  }, [hydrated, activeTab, scrollPositions]);

  useEffect(() => {
    if (!hydrated) return;
    if (activeTab !== "groups" && activeTab !== "schedule" && activeTab !== "third" && activeTab !== "live") return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrollPosition(activeTab, window.scrollY);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    const onPageHide = () => setScrollPosition(activeTab, window.scrollY);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [hydrated, activeTab, setScrollPosition]);
}