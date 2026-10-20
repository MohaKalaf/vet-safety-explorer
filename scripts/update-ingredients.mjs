// Refreshes the ingredient suggestions snapshot: node scripts/update-ingredients.mjs
// Kept as a snapshot so page loads never call openFDA just for suggestions.

import { writeFile } from "node:fs/promises";

const url =
  "https://api.fda.gov/animalandveterinary/event.json" +
  "?count=drug.active_ingredients.name.exact&limit=150";

const res = await fetch(url);
if (!res.ok) throw new Error(`openFDA request failed (${res.status})`);
const { results } = await res.json();

const out = new URL("../src/data/ingredient-counts.json", import.meta.url);
const fetched = new Date().toISOString().slice(0, 10);
await writeFile(out, JSON.stringify({ fetched, results }, null, 2) + "\n");

console.log(`Saved ${results.length} ingredient counts (${fetched})`);
