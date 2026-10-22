// Shape written by pipeline/vetsafety/export.py

export interface Signal {
  species: string;
  ingredient: string;
  reaction: string;
  cases: number;
  ingredientReports: number;
  prr: number;
  ciLow: number;
  ciHigh: number;
  chi2: number;
}

export interface SignalSnapshot {
  generated: string | null;
  dataFrom: string | null;
  dataTo: string | null;
  reports: number;
  signals: Signal[];
}

// Pets and the main farm species first, then anything else by number of signals
const PREFERRED = ["Dog", "Cat", "Horse", "Cattle", "Human"];

const TAB_LABELS: Record<string, string> = {
  Dog: "Dogs",
  Cat: "Cats",
  Horse: "Horses",
  Cattle: "Cattle",
  Human: "People (exposure)", // owners or vets exposed to an animal drug
};

export function speciesList(snapshot: SignalSnapshot): string[] {
  const counts = new Map<string, number>();
  for (const s of snapshot.signals) counts.set(s.species, (counts.get(s.species) ?? 0) + 1);
  const rank = (species: string) => {
    const i = PREFERRED.indexOf(species);
    return i === -1 ? PREFERRED.length : i;
  };
  return [...counts.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([species]) => species);
}

export function tabLabel(species: string): string {
  return TAB_LABELS[species] ?? species;
}

export function pickSpecies(requested: string | undefined, available: string[]): string | null {
  if (requested && available.includes(requested)) return requested;
  return available[0] ?? null;
}

export function signalsFor(snapshot: SignalSnapshot, species: string): Signal[] {
  return snapshot.signals.filter((s) => s.species === species);
}

export type SortKey = "drug" | "reaction" | "cases" | "prr" | "ci";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "cases", label: "Most reports" },
  { key: "prr", label: "Highest PRR" },
  { key: "ci", label: "Highest CI lower bound" },
  { key: "drug", label: "Drug A-Z" },
  { key: "reaction", label: "Reaction A-Z" },
];

// Most reports first by default. Sorting by PRR or even the CI lower bound puts
// 3-case pairs on top whenever the reaction is near-unique to one drug.
export const DEFAULT_SORT: SortKey = "cases";

const COMPARE: Record<SortKey, (a: Signal, b: Signal) => number> = {
  drug: (a, b) => a.ingredient.localeCompare(b.ingredient),
  reaction: (a, b) => a.reaction.localeCompare(b.reaction),
  cases: (a, b) => b.cases - a.cases,
  prr: (a, b) => b.prr - a.prr,
  ci: (a, b) => b.ciLow - a.ciLow,
};

// Each key has a natural direction (numbers high to low, text A-Z); reversed flips it
export function sortSignals(signals: Signal[], key: SortKey, reversed = false): Signal[] {
  const direction = reversed ? -1 : 1;
  return [...signals].sort(
    (a, b) => direction * COMPARE[key](a, b) || b.ciLow - a.ciLow || a.ingredient.localeCompare(b.ingredient),
  );
}
