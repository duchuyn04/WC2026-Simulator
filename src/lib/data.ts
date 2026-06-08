import seedData from "../../data/wc2026-seed.json";
import { assetPath } from "./base-path";
import type { GroupData, KnockoutMatch } from "./fifa/types";
import { fifaCodeToIso2 } from "./fifa/flag-codes";

export type SeedData = {
  seasonId: string;
  groups: GroupData[];
  knockout: KnockoutMatch[];
};

export const seed = seedData as SeedData;

export function getGroup(letter: string) {
  return seed.groups.find((g) => g.letter === letter);
}

/** Local flags in /public/flags — FIFA CDN returns empty body for hotlinking */
export function flagUrl(code: string) {
  return assetPath(`/flags/${code}.png`);
}

export function flagCdnUrl(code: string, width = 80) {
  return `https://flagcdn.com/w${width}/${fifaCodeToIso2(code)}.png`;
}