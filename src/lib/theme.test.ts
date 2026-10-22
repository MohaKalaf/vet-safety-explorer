import { describe, expect, it } from "vitest";
import { parseTheme } from "./theme";

describe("parseTheme", () => {
  it("keeps light and dark", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("falls back to system for anything else", () => {
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme("system")).toBe("system");
    expect(parseTheme("purple")).toBe("system");
  });
});
