import { describe, expect, it } from "vitest";
import snapshot from "../data/ingredient-counts.json";
import { ingredientNames, topIngredients } from "./ingredients";

describe("ingredientNames", () => {
  it.each([
    ["Lotilaner", ["lotilaner"]],
    ["Milbemycin Oxime", ["milbemycin"]],
    ["Pyrantel As Pamoate Salt", ["pyrantel"]],
    ["Fluralaner 13.64% 12-Week Chew", ["fluralaner"]],
    ["Ivermectin/Pyrantel Pamoate Chewable 272Mcg/652Mg", ["ivermectin", "pyrantel"]],
    ["Lotilaner,Moxidectin,Praziquantel,Pyrantel Pamoate", ["lotilaner", "moxidectin", "praziquantel", "pyrantel"]],
    ["Amoxicillin Trihydrate;Clavulanate Potassium ( K-Clavulanate)", ["amoxicillin", "clavulanate"]],
    ["(S)-Methoprene", ["methoprene"]],
    ["Cyclosporine A", ["cyclosporine"]],
    ["Tigilanol Tiglate", ["tigilanol"]],
  ])("%s", (term, expected) => {
    expect(ingredientNames(term)).toEqual(expected);
  });

  it.each([
    "Unknown",
    "Rabies Vaccine",
    "Rabies Virus, Kv",
    "Anti-Il31 Mab Mcs Lot #1283563",
    "Water, Sodium Chloride, Sodium Lactate, Potassium Chloride, Calcium Chloride",
  ])("drops non-drug entry %s", (term) => {
    expect(ingredientNames(term)).toEqual([]);
  });
});

describe("topIngredients", () => {
  it("sums counts across salts, products and combinations", () => {
    const rows = [
      { term: "Pyrantel Pamoate", count: 10 },
      { term: "Ivermectin, Pyrantel", count: 5 },
      { term: "Ivermectin", count: 12 },
      { term: "Lotilaner", count: 1 },
    ];
    expect(topIngredients(rows, 2)).toEqual(["ivermectin", "pyrantel"]);
  });

  it("gives clean, unique names from the real snapshot", () => {
    const names = topIngredients(snapshot.results, 40);
    expect(names).toHaveLength(40);
    expect(new Set(names).size).toBe(40);
    expect(names).toContain("lotilaner");
    for (const name of names) expect(name).toMatch(/^[a-z][a-z -]*$/);
  });
});
