export const TAB_IDS = ["groups", "schedule", "third", "knockout"] as const;

export type TabId = (typeof TAB_IDS)[number];

export const SCROLLABLE_TABS = ["groups", "schedule", "third"] as const satisfies readonly TabId[];

export type ScrollableTabId = (typeof SCROLLABLE_TABS)[number];