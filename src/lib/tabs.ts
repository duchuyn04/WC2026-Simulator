export const TAB_IDS = ["live", "groups", "schedule", "fav-matches", "fav-teams", "third", "knockout"] as const;

export type TabId = (typeof TAB_IDS)[number];

export const SCROLLABLE_TABS = ["live", "groups", "schedule", "fav-matches", "fav-teams", "third"] as const satisfies readonly TabId[];

export type ScrollableTabId = (typeof SCROLLABLE_TABS)[number];