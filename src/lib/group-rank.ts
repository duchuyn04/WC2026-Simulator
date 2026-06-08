import type { GroupData, Team } from "./fifa/types";

export type GroupRankSlots = {
  first: string;
  second: string;
  third: string;
  fourth: string;
};

export function orderToSlots(order: string[]): GroupRankSlots {
  return {
    first: order[0] ?? "",
    second: order[1] ?? "",
    third: order[2] ?? "",
    fourth: order[3] ?? "",
  };
}

export function slotsToOrder(slots: GroupRankSlots): string[] {
  return [slots.first, slots.second, slots.third, slots.fourth];
}

export function remainingTeam(teams: Team[], usedIds: string[]): Team | null {
  return teams.find((team) => !usedIds.includes(team.id)) ?? null;
}

function resolveFourth(slots: GroupRankSlots, teams: Team[]): string {
  if (slots.fourth) return slots.fourth;
  if (!slots.third) return "";
  return remainingTeam(teams, [slots.first, slots.second, slots.third].filter(Boolean))?.id || "";
}

export function parseGroupRankOrder(order: string[], teams: Team[]): GroupRankSlots {
  const slots = orderToSlots(order);
  return { ...slots, fourth: resolveFourth(slots, teams) };
}

export function buildGroupRankOrder(slots: GroupRankSlots, teams: Team[]): string[] {
  const fourth = resolveFourth(slots, teams);
  return [slots.first, slots.second, slots.third, fourth];
}

export function assignFirst(order: string[], teamId: string, teams: Team[]): string[] {
  const slots = parseGroupRankOrder(order, teams);
  const next: GroupRankSlots = {
    first: teamId,
    second: slots.second === teamId ? "" : slots.second,
    third: slots.third === teamId ? "" : slots.third,
    fourth: "",
  };
  return buildGroupRankOrder(next, teams);
}

export function assignSecond(order: string[], teamId: string, teams: Team[]): string[] {
  const slots = parseGroupRankOrder(order, teams);
  const next: GroupRankSlots = {
    first: slots.first === teamId ? "" : slots.first,
    second: teamId,
    third: slots.third === teamId ? "" : slots.third,
    fourth: "",
  };
  return buildGroupRankOrder(next, teams);
}

export function assignThird(order: string[], teamId: string, teams: Team[]): string[] {
  const slots = parseGroupRankOrder(order, teams);
  const next: GroupRankSlots = {
    ...slots,
    third: teamId,
    fourth: "",
  };
  return buildGroupRankOrder(next, teams);
}

export function swapTopTwo(order: string[], teams: Team[]): string[] {
  const slots = parseGroupRankOrder(order, teams);
  if (!slots.first || !slots.second) return order;
  return buildGroupRankOrder({ ...slots, first: slots.second, second: slots.first }, teams);
}

export function topTwoRows(order: string[], teams: Team[]) {
  const slots = parseGroupRankOrder(order, teams);
  return [slots.first, slots.second].filter(Boolean);
}

/** Đủ 4 đội cho pipeline knockout; hạng 3–4 tạm từ seed nếu chưa chọn. */
export function resolveRankModeTeams(group: GroupData, order: string[]): Team[] | null {
  const slots = parseGroupRankOrder(order, group.teams);
  if (!slots.first || !slots.second) return null;

  const byId = new Map(group.teams.map((t) => [t.id, t]));
  const first = byId.get(slots.first);
  const second = byId.get(slots.second);
  if (!first || !second) return null;

  const used = new Set([slots.first, slots.second]);
  const remaining = group.teams.filter((t) => !used.has(t.id));

  if (slots.third) {
    const third = byId.get(slots.third);
    if (!third) return null;
    const fourth = slots.fourth
      ? byId.get(slots.fourth)
      : remaining.find((t) => t.id !== slots.third);
    if (!fourth) return null;
    return [first, second, third, fourth];
  }

  if (remaining.length < 2) return null;
  return [first, second, remaining[0]!, remaining[1]!];
}

export function confirmedRankIds(order: string[], teams: Team[]): string[] {
  const slots = parseGroupRankOrder(order, teams);
  return [slots.first, slots.second, slots.third, slots.fourth].filter(Boolean);
}