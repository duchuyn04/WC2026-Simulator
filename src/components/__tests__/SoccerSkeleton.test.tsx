import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import SoccerSkeleton from "../SoccerSkeleton";

describe("SoccerSkeleton", () => {
  it("renders standings variant with soccer ball SVG", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(SoccerSkeleton, { variant: "standings" })
    );
    expect(html).toContain("svg");
    expect(html).toContain("animate-soccer-bounce");
  });

  it("renders stats variant with soccer ball SVG", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(SoccerSkeleton, { variant: "stats" })
    );
    expect(html).toContain("svg");
    expect(html).toContain("animate-soccer-shadow");
  });

  it("renders match-detail variant with soccer ball SVG", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(SoccerSkeleton, { variant: "match-detail" })
    );
    expect(html).toContain("svg");
    expect(html).toContain("animate-soccer-bounce");
  });
});
