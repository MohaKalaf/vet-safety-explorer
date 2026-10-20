import { describe, expect, it } from "vitest";
import { OPENFDA_EVENT_URL, buildSearch, buildUrl, sanitizeTerm } from "./query";

describe("sanitizeTerm", () => {
  it("trims and collapses whitespace", () => {
    expect(sanitizeTerm("  lotilaner   tablets ")).toBe("lotilaner tablets");
  });

  it("strips characters that would break an openFDA query", () => {
    expect(sanitizeTerm('lotilaner" OR animal.species:"Cat')).toBe(
      "lotilaner OR animal.species Cat",
    );
  });

  it("returns an empty string for missing or blank input", () => {
    expect(sanitizeTerm(undefined)).toBe("");
    expect(sanitizeTerm(null)).toBe("");
    expect(sanitizeTerm('  "" ')).toBe("");
  });

  it("caps very long input at 60 characters", () => {
    expect(sanitizeTerm("a".repeat(200))).toHaveLength(60);
  });
});

describe("buildSearch", () => {
  it("returns an empty string when there are no filters", () => {
    expect(buildSearch({})).toBe("");
  });

  it("builds an ingredient-only search", () => {
    expect(buildSearch({ ingredient: "Lotilaner" })).toBe(
      'drug.active_ingredients.name:"Lotilaner"',
    );
  });

  it("joins ingredient and species with AND", () => {
    expect(buildSearch({ ingredient: "lotilaner", species: "Dog" })).toBe(
      'drug.active_ingredients.name:"lotilaner" AND animal.species:"Dog"',
    );
  });

  it("appends extra clauses", () => {
    expect(buildSearch({ species: "Cat" }, ['serious_ae:"true"'])).toBe(
      'animal.species:"Cat" AND serious_ae:"true"',
    );
  });

  it("ignores filters that are blank after cleaning", () => {
    expect(buildSearch({ ingredient: '""', species: "Dog" })).toBe(
      'animal.species:"Dog"',
    );
  });
});

describe("buildUrl", () => {
  it("returns the bare endpoint when given nothing", () => {
    expect(buildUrl({})).toBe(OPENFDA_EVENT_URL);
  });

  it("encodes the search and other parameters", () => {
    const url = new URL(
      buildUrl({
        search: 'animal.species:"Dog"',
        count: "reaction.veddra_term_name.exact",
        limit: 5,
      }),
    );
    expect(url.searchParams.get("search")).toBe('animal.species:"Dog"');
    expect(url.searchParams.get("count")).toBe("reaction.veddra_term_name.exact");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.has("api_key")).toBe(false);
  });

  it("includes the API key only when one is given", () => {
    const url = new URL(buildUrl({ limit: 1, apiKey: "secret" }));
    expect(url.searchParams.get("api_key")).toBe("secret");
  });
});
