import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import SoccerSkeleton from "../SoccerSkeleton";

describe("SoccerSkeleton", () => {
  it("renders standings variant with grid columns", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(SoccerSkeleton, { variant: "standings" })
    );
    expect(html).toContain("svg");
    expect(html).toContain("grid");
  });

  it("renders stats variant", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(SoccerSkeleton, { variant: "stats" })
    );
    expect(html).toContain("animate-pulse");
  });

  it("renders match-detail variant", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(SoccerSkeleton, { variant: "match-detail" })
    );
    expect(html).toContain("rounded-2xl");
  });
});
