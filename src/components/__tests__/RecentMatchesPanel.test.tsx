// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RecentMatchesPanel } from "../RecentMatchesPanel";
import type { EspnScoreboardMatch } from "@/lib/espn-match";
import * as hooks from "@/lib/hooks";
import * as store from "@/lib/store";

const espnToLocal = { "203": "43911", "467": "43883" };

vi.mock("@/lib/hooks", async () => {
  const actual = await vi.importActual<typeof hooks>("@/lib/hooks");
  return {
    ...actual,
    useSchedule: vi.fn(),
  };
});

vi.mock("@/lib/store", async () => {
  const actual = await vi.importActual<typeof store>("@/lib/store");
  return {
    ...actual,
    useSimulation: vi.fn(),
  };
});

const applyLiveResults = vi.fn();

vi.mocked(store.useSimulation).mockImplementation((selector) =>
  selector({ applyLiveResults } as unknown as import("@/lib/store").SimulationStore)
);

const mockEntries = [
  {
    id: "g1",
    matchNumber: 1,
    kind: "group",
    stageLabel: "Vòng bảng",
    date: "2026-06-11T19:00Z",
    home: { id: "43911", code: "MEX", name: "Mexico", flagUrl: "" },
    away: { id: "43883", code: "RSA", name: "South Africa", flagUrl: "" },
    homePlaceholder: "A1",
    awayPlaceholder: "A2",
  },
];

const mockEspnMatches: EspnScoreboardMatch[] = [
  {
    id: "760415",
    date: "2026-06-11T19:00Z",
    status: "STATUS_FULL_TIME",
    state: "post",
    shortDetail: "FT",
    displayClock: "90'",
    homeId: "203",
    awayId: "467",
    homeScore: "2",
    awayScore: "1",
  },
];

describe("RecentMatchesPanel", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useSchedule.mockReturnValue(mockEntries);
  });

  it("renders empty state when no finished matches", () => {
    render(<RecentMatchesPanel espnMatches={[]} mode="recent-5" showSyncAll />);
    expect(screen.getByText("Chưa có trận nào kết thúc.")).toBeInTheDocument();
  });

  it("renders recent matches and sync button", () => {
    render(
      <RecentMatchesPanel espnMatches={mockEspnMatches} mode="recent-5" showSyncAll />
    );
    expect(screen.getByText("Các trận gần nhất", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Mexico")).toBeInTheDocument();
    expect(screen.getByText("South Africa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đồng bộ tất cả/i })).toBeInTheDocument();
  });

  it("calls onOpenDetail when a card is clicked", () => {
    const onOpenDetail = vi.fn();

    render(
      <RecentMatchesPanel
        espnMatches={mockEspnMatches}
        mode="recent-5"
        onOpenDetail={onOpenDetail}
      />
    );

    fireEvent.click(screen.getByText("Mexico"));
    expect(onOpenDetail).toHaveBeenCalled();
  });
});
