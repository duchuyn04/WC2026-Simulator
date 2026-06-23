export const TAB_IDS = ["live", "groups", "schedule", "fav-matches", "fav-teams", "third", "knockout"] as const;

export type TabId = (typeof TAB_IDS)[number];