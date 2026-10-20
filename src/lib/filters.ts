import { sanitizeTerm } from "./openfda/query";
import type { SearchFilters } from "./openfda/types";

// value = openFDA species name, label reads in the sentence
export const SPECIES_OPTIONS = [
  { value: "", label: "any animal" },
  { value: "Dog", label: "dogs" },
  { value: "Cat", label: "cats" },
  { value: "Horse", label: "horses" },
  { value: "Cattle", label: "cattle" },
] as const;

// All isoxazolines (flea/tick), so comparable
export const EXAMPLE_SEARCHES: SearchFilters[] = [
  { ingredient: "lotilaner", species: "Dog" },
  { ingredient: "afoxolaner", species: "Dog" },
  { ingredient: "fluralaner", species: "Cat" },
];

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseFilters(params: RawParams): SearchFilters {
  const filters: SearchFilters = {};
  const ingredient = sanitizeTerm(first(params.ingredient));
  const species = sanitizeTerm(first(params.species));
  if (ingredient) filters.ingredient = ingredient;
  if (species) filters.species = species;
  return filters;
}

// Submitting the form always sends both keys, even blank (?ingredient=&species=).
// A blank search means "all reports"; no keys at all means a fresh visit.
export function isSearch(params: RawParams): boolean {
  return "ingredient" in params || "species" in params;
}

export function searchHref(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.ingredient) params.set("ingredient", filters.ingredient);
  if (filters.species) params.set("species", filters.species);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function speciesLabel(value: string | undefined): string {
  const match = SPECIES_OPTIONS.find((option) => option.value === (value ?? ""));
  return match ? match.label : (value ?? "any animal");
}
