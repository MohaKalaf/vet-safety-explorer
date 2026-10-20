// openFDA updates weekly and rate-limits, so cache per search (args = cache key).
// Separate from client.ts so tests don't need Next.
// unstable_cache rather than 'use cache' because cacheComponents is off (see next.config.ts).

import { unstable_cache } from "next/cache";
import { getSafetyOverview } from "./client";
import type { SearchFilters } from "./types";

const SIX_HOURS = 6 * 60 * 60;

export const getCachedSafetyOverview = unstable_cache(
  (filters: SearchFilters) =>
    getSafetyOverview(filters, { apiKey: process.env.OPENFDA_API_KEY }),
  ["safety-overview"],
  { revalidate: SIX_HOURS },
);
