import { describe, expect, it } from "vitest";
import { hasFilters, parseFilters, searchHref, speciesLabel } from "./filters";

describe("parseFilters", () => {
  it("reads ingredient and species", () => {
    expect(parseFilters({ ingredient: "lotilaner", species: "Dog" })).toEqual({
      ingredient: "lotilaner",
      species: "Dog",
    });
  });

  it("drops blank values", () => {
    expect(parseFilters({ ingredient: "   ", species: "" })).toEqual({});
  });

  it("uses the first value when a parameter is repeated", () => {
    expect(parseFilters({ species: ["Cat", "Dog"] })).toEqual({ species: "Cat" });
  });

  it("cleans unsafe characters", () => {
    expect(parseFilters({ ingredient: '"lotilaner"' })).toEqual({
      ingredient: "lotilaner",
    });
  });
});

describe("hasFilters", () => {
  it("is false for an empty search", () => {
    expect(hasFilters({})).toBe(false);
  });

  it("is true when either filter is set", () => {
    expect(hasFilters({ species: "Dog" })).toBe(true);
  });
});

describe("searchHref", () => {
  it("builds a shareable link", () => {
    expect(searchHref({ ingredient: "lotilaner", species: "Dog" })).toBe(
      "/?ingredient=lotilaner&species=Dog",
    );
  });

  it("links to the home page when there are no filters", () => {
    expect(searchHref({})).toBe("/");
  });
});

describe("speciesLabel", () => {
  it("turns a value into its plural label", () => {
    expect(speciesLabel("Dog")).toBe("dogs");
    expect(speciesLabel(undefined)).toBe("any animal");
  });

  it("falls back to the raw value for species not in the list", () => {
    expect(speciesLabel("Rabbit")).toBe("Rabbit");
  });
});
