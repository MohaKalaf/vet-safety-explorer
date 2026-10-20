import type { SearchFilters } from "./types";

export const OPENFDA_EVENT_URL =
  "https://api.fda.gov/animalandveterinary/event.json";

const MAX_TERM_LENGTH = 60;

// Strips anything that could break out of the quoted term in the query syntax
export function sanitizeTerm(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .replace(/["\\():[\]{}^~*?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TERM_LENGTH)
    .trim();
}

// e.g. drug.active_ingredients.name:"lotilaner" AND animal.species:"Dog"
// Empty string = no filter = all reports
export function buildSearch(
  filters: SearchFilters,
  extra: string[] = [],
): string {
  const parts: string[] = [];

  const ingredient = sanitizeTerm(filters.ingredient);
  if (ingredient) parts.push(`drug.active_ingredients.name:"${ingredient}"`);

  const species = sanitizeTerm(filters.species);
  if (species) parts.push(`animal.species:"${species}"`);

  parts.push(...extra);
  return parts.join(" AND ");
}

export interface QueryOptions {
  search?: string;
  count?: string;
  limit?: number;
  sort?: string;
  apiKey?: string;
}

export function buildUrl(options: QueryOptions): string {
  const params = new URLSearchParams();
  if (options.apiKey) params.set("api_key", options.apiKey);
  if (options.search) params.set("search", options.search);
  if (options.count) params.set("count", options.count);
  if (options.sort) params.set("sort", options.sort);
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const query = params.toString();
  return query ? `${OPENFDA_EVENT_URL}?${query}` : OPENFDA_EVENT_URL;
}
