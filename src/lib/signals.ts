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

// Ranked by the CI's lower bound: a big PRR from 3 cases is less convincing than
// a smaller one from 300, and the lower bound accounts for that.
export function signalsFor(snapshot: SignalSnapshot, species: string): Signal[] {
  return snapshot.signals
    .filter((s) => s.species === species)
    .sort((a, b) => b.ciLow - a.ciLow);
}
