// openFDA updates weekly and rate-limits, so cache per search (args = cache key).
// Separate from client.ts so tests don't need Next.

import { cacheLife } from "next/cache";
import { getSafetyOverview } from "./client";
import type { SafetyOverview, SearchFilters } from "./types";

export async function getCachedSafetyOverview(
  filters: SearchFilters,
): Promise<SafetyOverview> {
  "use cache";
  cacheLife("hours");
  return getSafetyOverview(filters, { apiKey: process.env.OPENFDA_API_KEY });
}
