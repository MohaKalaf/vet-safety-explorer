import { describe, expect, it } from "vitest";
import snapshotFile from "../data/signals.json";
import { pickSpecies, signalsFor, speciesList, tabLabel, type Signal, type SignalSnapshot } from "./signals";

function signal(species: string, ingredient: string, ciLow: number): Signal {
  return { species, ingredient, reaction: "Seizure", cases: 5, ingredientReports: 80, prr: ciLow * 2, ciLow, ciHigh: ciLow * 4, chi2: 10 };
}

const snapshot: SignalSnapshot = {
  generated: "2026-10-21",
  dataFrom: "2023-01-03",
  dataTo: "2026-06-30",
  reports: 1000,
  signals: [
    signal("Cat", "a", 3),
    signal("Dog", "b", 2),
    signal("Dog", "c", 5),
    signal("Human", "d", 4),
    signal("Sheep", "e", 2),
    signal("Goat", "f", 2),
    signal("Goat", "g", 2),
    signal("Goat", "h", 2),
  ],
};

describe("speciesList", () => {
  it("puts the main species first, then the rest by number of signals", () => {
    expect(speciesList(snapshot)).toEqual(["Dog", "Cat", "Human", "Goat", "Sheep"]);
  });
});

describe("tabLabel", () => {
  it("names known species and passes others through", () => {
    expect(tabLabel("Dog")).toBe("Dogs");
    expect(tabLabel("Human")).toBe("People (exposure)");
    expect(tabLabel("Goat")).toBe("Goat");
  });
});

describe("pickSpecies", () => {
  it("uses the requested species when it has signals", () => {
    expect(pickSpecies("Cat", ["Dog", "Cat"])).toBe("Cat");
  });

  it("falls back to the first species for unknown or missing input", () => {
    expect(pickSpecies("Llama", ["Dog", "Cat"])).toBe("Dog");
    expect(pickSpecies(undefined, ["Dog", "Cat"])).toBe("Dog");
  });

  it("returns null when there are no signals at all", () => {
    expect(pickSpecies("Dog", [])).toBeNull();
  });
});

describe("signalsFor", () => {
  it("filters by species and ranks by CI lower bound", () => {
    expect(signalsFor(snapshot, "Dog").map((s) => s.ingredient)).toEqual(["c", "b"]);
  });
});

describe("the committed snapshot", () => {
  it("has the shape the page expects", () => {
    const file = snapshotFile as SignalSnapshot;
    expect(typeof file.reports).toBe("number");
    expect(Array.isArray(file.signals)).toBe(true);
    for (const s of file.signals) {
      expect(s.ciLow).toBeLessThanOrEqual(s.prr);
      expect(s.prr).toBeLessThanOrEqual(s.ciHigh);
    }
  });
});
