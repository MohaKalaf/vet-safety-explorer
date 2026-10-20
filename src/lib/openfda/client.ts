// fetchFn is injectable so tests never hit the network.

import { buildSearch, buildUrl } from "./query";
import { aggregateByYear, mergeReactionCounts, toReportSummary } from "./transform";
import type {
  OpenFdaResponse,
  RawReport,
  SafetyOverview,
  SearchFilters,
  TermCount,
  TimeCount,
} from "./types";

export type FetchFn = typeof fetch;

export class OpenFdaError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OpenFdaError";
  }
}

const SERIOUS = 'serious_ae:"true"';

export async function fetchOpenFda<T>(
  url: string,
  fetchFn: FetchFn = fetch,
): Promise<OpenFdaResponse<T>> {
  const res = await fetchFn(url, { headers: { Accept: "application/json" } });

  // openFDA returns 404 for "no matches", not an actual error
  if (res.status === 404) {
    return { meta: { results: { skip: 0, limit: 0, total: 0 } }, results: [] };
  }
  if (res.status === 429) {
    throw new OpenFdaError("openFDA rate limit reached. Try again shortly.", 429);
  }
  if (!res.ok) {
    throw new OpenFdaError(`openFDA request failed (${res.status}).`, res.status);
  }

  const body = (await res.json()) as Partial<OpenFdaResponse<T>>;
  return { meta: body.meta, results: body.results ?? [] };
}

interface ClientOptions {
  apiKey?: string;
  fetchFn?: FetchFn;
}

// limit=1 because only meta (total, last_updated) is needed
export async function countReports(
  search: string,
  { apiKey, fetchFn }: ClientOptions = {},
): Promise<{ total: number; lastUpdated: string | null }> {
  const url = buildUrl({ search, limit: 1, apiKey });
  const data = await fetchOpenFda<RawReport>(url, fetchFn);
  return {
    total: data.meta?.results?.total ?? 0,
    lastUpdated: data.meta?.last_updated ?? null,
  };
}

// Over-fetch: merging split VeDDRA terms can reshuffle the top N
export async function getTopReactions(
  search: string,
  limit = 10,
  { apiKey, fetchFn }: ClientOptions = {},
): Promise<TermCount[]> {
  const url = buildUrl({
    search,
    count: "reaction.veddra_term_name.exact",
    limit: limit * 3,
    apiKey,
  });
  const data = await fetchOpenFda<TermCount>(url, fetchFn);
  return mergeReactionCounts(data.results, limit);
}

export async function getReportsByYear(
  search: string,
  { apiKey, fetchFn }: ClientOptions = {},
) {
  const url = buildUrl({ search, count: "original_receive_date", apiKey });
  const data = await fetchOpenFda<TimeCount>(url, fetchFn);
  return aggregateByYear(data.results);
}

export async function getRecentReports(
  search: string,
  limit = 10,
  { apiKey, fetchFn }: ClientOptions = {},
) {
  const url = buildUrl({
    search,
    limit,
    sort: "original_receive_date:desc",
    apiKey,
  });
  const data = await fetchOpenFda<RawReport>(url, fetchFn);
  return data.results.map(toReportSummary);
}

export async function getSafetyOverview(
  filters: SearchFilters,
  options: ClientOptions = {},
): Promise<SafetyOverview> {
  const search = buildSearch(filters);
  const seriousSearch = buildSearch(filters, [SERIOUS]);

  const [all, serious, topReactions, reportsByYear, recentReports] =
    await Promise.all([
      countReports(search, options),
      countReports(seriousSearch, options),
      getTopReactions(search, 10, options),
      getReportsByYear(search, options),
      getRecentReports(search, 10, options),
    ]);

  return {
    dataLastUpdated: all.lastUpdated,
    totalReports: all.total,
    seriousReports: serious.total,
    topReactions,
    reportsByYear,
    recentReports,
  };
}
