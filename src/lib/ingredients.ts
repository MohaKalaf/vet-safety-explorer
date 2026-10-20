import type { TermCount } from "./openfda/types";

// openFDA ingredient names mix in doses, dosage forms, salts and combinations,
// e.g. "Ivermectin/Pyrantel Pamoate Chewable 272Mcg/652Mg". Searches match
// phrases, so the base name ("pyrantel") already covers its salts and products.

const SEPARATORS = /\s*(?:[;,/+&]|\band\b)\s*/i;

// Vaccines, fluids, lot codes etc. Not useful as drug suggestions.
const NOT_A_DRUG =
  /\b(unknown|vaccines?|virus|leptospira|bordetella|recombinant|recombitek|coli|water|mab|lot)\b/i;

const NOISE = new Set([
  // dosage forms
  "chew", "chews", "chewable", "tablet", "tablets", "spot-on", "solution",
  "injection", "injectable", "inj", "vial", "granules", "powder", "susp",
  "suspension", "oint", "ointment", "ear", "for",
  // salts and other suffixes
  "as", "salt", "oxime", "maleate", "citrate", "hydrochloride", "dihydrochloride",
  "hcl", "pamoate", "sodium", "potassium", "phosphate", "tartrate", "trihydrate",
  "monohydrate", "proline", "acetate", "valerate", "furoate", "proxetil",
  "crystalline", "free", "acid", "sulfate", "pivalate", "tiglate",
  "polysulfate", "polysulfated",
]);

export function ingredientNames(term: string): string[] {
  if (NOT_A_DRUG.test(term)) return [];

  const names = term.split(SEPARATORS).map((part) =>
    part
      .replace(/\([^)]*\)/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => !/\d/.test(word)) // doses, lot numbers, "12-week"
      .map((word) => word.replace(/^[^a-z]+|[^a-z]+$/g, ""))
      // < 4 chars: "a", "kv", abbreviations like "pzq"
      .filter((word) => word.length >= 4 && !NOISE.has(word))
      .join(" "),
  );
  return [...new Set(names.filter(Boolean))];
}

export function topIngredients(rows: TermCount[], limit: number): string[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    for (const name of ingredientNames(row.term)) {
      totals.set(name, (totals.get(name) ?? 0) + row.count);
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}
