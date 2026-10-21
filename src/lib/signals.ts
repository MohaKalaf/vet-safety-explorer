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

// Most signals first
export function speciesList(snapshot: SignalSnapshot): string[] {
  const counts = new Map<string, number>();
  for (const s of snapshot.signals) counts.set(s.species, (counts.get(s.species) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([species]) => species);
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
