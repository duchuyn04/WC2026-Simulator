import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { PortraitImage, PortraitPlaceholder, initialsFromName } from "../PortraitImage";

describe("initialsFromName", () => {
  it("returns initials from full name", () => {
    expect(initialsFromName("DIOGO COSTA")).toBe("DC");
  });

  it("returns two letters for single word name", () => {
    expect(initialsFromName("Player")).toBe("PL");
  });

  it("returns ? for null", () => {
    expect(initialsFromName(null)).toBe("?");
  });
});

describe("PortraitPlaceholder", () => {
  it("renders team code, badge, and initials without 'No image' text", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(PortraitPlaceholder, {
        badge: "#10",
        label: "Forward",
        name: "Test Player",
        teamCode: "POR",
        primaryColor: "#D52B1E",
        secondaryColor: "#FFFFFF",
      })
    );
    expect(html).toContain("POR");
    expect(html).toContain("#10");
    expect(html).toContain("TP");
    expect(html).not.toContain("No image");
    expect(html).toContain("svg");
  });
});

describe("PortraitImage", () => {
  it("renders placeholder when no src", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(PortraitImage, {
        src: null,
        alt: "Test",
        placeholderProps: {
          badge: "#7",
          label: "Midfielder",
          name: "Cristiano Ronaldo",
          teamCode: "POR",
          primaryColor: "#D52B1E",
          secondaryColor: "#FFFFFF",
        },
      })
    );
    expect(html).toContain("CR");
    expect(html).not.toContain("No image");
  });

  it("renders img when src provided", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(PortraitImage, {
        src: "https://example.com/player.png",
        alt: "Player",
        placeholderProps: {
          badge: "#1",
          label: "Goalkeeper",
          name: "Player",
          teamCode: "CAN",
        },
      })
    );
    expect(html).toContain("<img");
    expect(html).toContain("https://example.com/player.png");
    expect(html).not.toContain("No image");
  });
});
