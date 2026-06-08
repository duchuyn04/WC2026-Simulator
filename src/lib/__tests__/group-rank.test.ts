import { describe, expect, it } from "vitest";
import {
  assignFirst,
  assignSecond,
  assignThird,
  buildGroupRankOrder,
  confirmedRankIds,
  parseGroupRankOrder,
  remainingTeam,
  resolveRankModeTeams,
  swapTopTwo,
} from "../group-rank";
import { getGroup } from "../data";
import type { Team } from "../fifa/types";

const teams: Team[] = [
  { id: "mex", code: "MEX", name: "Mexico", flagUrl: "" },
  { id: "rsa", code: "RSA", name: "South Africa", flagUrl: "" },
  { id: "kor", code: "KOR", name: "Korea", flagUrl: "" },
  { id: "cze", code: "CZE", name: "Czechia", flagUrl: "" },
];

const emptyOrder = ["", "", "", ""];

describe("remainingTeam", () => {
  it("trả về đội chưa được chọn", () => {
    expect(remainingTeam(teams, ["mex", "rsa", "kor"])?.id).toBe("cze");
  });
});

describe("parseGroupRankOrder", () => {
  it("tự gán hạng 4 khi thiếu", () => {
    const slots = parseGroupRankOrder(["mex", "rsa", "kor", ""], teams);
    expect(slots).toEqual({
      first: "mex",
      second: "rsa",
      third: "kor",
      fourth: "cze",
    });
  });
});

describe("buildGroupRankOrder", () => {
  it("điền hạng 4 từ đội còn lại", () => {
    expect(
      buildGroupRankOrder({ first: "mex", second: "rsa", third: "kor", fourth: "" }, teams)
    ).toEqual(["mex", "rsa", "kor", "cze"]);
  });
});

describe("assignFirst", () => {
  it("gán nhất và giữ nhì nếu khác đội", () => {
    const order = ["kor", "rsa", "mex", "cze"];
    expect(assignFirst(order, "mex", teams)).toEqual(["mex", "rsa", "", ""]);
  });

  it("xóa nhì nếu chọn lại đội đang là nhì", () => {
    const order = ["kor", "rsa", "mex", "cze"];
    expect(assignFirst(order, "rsa", teams)).toEqual(["rsa", "", "mex", "kor"]);
  });

  it("xóa hạng 3 nếu chọn lại đội đang là hạng 3", () => {
    const order = ["mex", "rsa", "kor", "cze"];
    expect(assignFirst(order, "kor", teams)).toEqual(["kor", "rsa", "", ""]);
  });
});

describe("assignSecond", () => {
  it("gán nhì và giữ nhất nếu khác đội", () => {
    const order = ["mex", "", "kor", "cze"];
    expect(assignSecond(order, "rsa", teams)).toEqual(["mex", "rsa", "kor", "cze"]);
  });

  it("xóa nhất nếu chọn lại đội đang là nhất", () => {
    const order = ["mex", "rsa", "kor", "cze"];
    expect(assignSecond(order, "mex", teams)).toEqual(["", "mex", "kor", "rsa"]);
  });
});

describe("assignThird", () => {
  it("chỉ đổi hạng 3, giữ nhất nhì", () => {
    const order = ["mex", "rsa", "kor", "cze"];
    expect(assignThird(order, "cze", teams)).toEqual(["mex", "rsa", "cze", "kor"]);
  });
});

describe("confirmedRankIds", () => {
  it("chỉ trả về hạng đã chọn", () => {
    expect(confirmedRankIds(["mex", "rsa", "", ""], teams)).toEqual(["mex", "rsa"]);
    expect(confirmedRankIds(["mex", "rsa", "kor", "cze"], teams)).toEqual([
      "mex",
      "rsa",
      "kor",
      "cze",
    ]);
  });
});

describe("resolveRankModeTeams", () => {
  const group = getGroup("A")!;
  const [mex, rsa, kor, cze] = group.teams.map((t) => t.id);

  it("tạm hạng 3–4 khi chưa chọn hạng 3", () => {
    const resolved = resolveRankModeTeams(group, [mex, rsa, "", ""]);
    expect(resolved?.map((t) => t.code)).toEqual(["MEX", "RSA", "KOR", "CZE"]);
  });

  it("null khi thiếu nhất hoặc nhì", () => {
    expect(resolveRankModeTeams(group, emptyOrder)).toBeNull();
  });
});

describe("swapTopTwo", () => {
  it("hoán đổi nhất ↔ nhì", () => {
    const order = ["mex", "rsa", "kor", "cze"];
    expect(swapTopTwo(order, teams)).toEqual(["rsa", "mex", "kor", "cze"]);
  });

  it("không đổi khi thiếu nhất hoặc nhì", () => {
    expect(swapTopTwo(emptyOrder, teams)).toEqual(emptyOrder);
    expect(swapTopTwo(["mex", "", "", ""], teams)).toEqual(["mex", "", "", ""]);
  });
});