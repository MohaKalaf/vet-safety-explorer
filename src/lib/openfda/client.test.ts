import { describe, expect, it, vi } from "vitest";
import {
  OpenFdaError,
  fetchOpenFda,
  getSafetyOverview,
  type FetchFn,
} from "./client";

function fakeFetch(status: number, body: unknown): FetchFn {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  ) as unknown as FetchFn;
}

describe("fetchOpenFda", () => {
  it("returns results and meta on success", async () => {
    const body = { meta: { results: { skip: 0, limit: 1, total: 42 } }, results: [{ a: 1 }] };
    const data = await fetchOpenFda("https://example.test", fakeFetch(200, body));
    expect(data.results).toEqual([{ a: 1 }]);
    expect(data.meta?.results?.total).toBe(42);
  });

  it("treats openFDA's 404 'no matches' as an empty result", async () => {
    const body = { error: { code: "NOT_FOUND", message: "No matches found!" } };
    const data = await fetchOpenFda("https://example.test", fakeFetch(404, body));
    expect(data.results).toEqual([]);
    expect(data.meta?.results?.total).toBe(0);
  });

  it("throws a clear error when rate limited", async () => {
    await expect(
      fetchOpenFda("https://example.test", fakeFetch(429, {})),
    ).rejects.toMatchObject({ name: "OpenFdaError", status: 429 });
  });

  it("throws OpenFdaError for server errors", async () => {
    await expect(
      fetchOpenFda("https://example.test", fakeFetch(500, {})),
    ).rejects.toBeInstanceOf(OpenFdaError);
  });
});

describe("getSafetyOverview", () => {
  it("makes five requests and combines them", async () => {
    // Fake openFDA, routed on the query params
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const count = url.searchParams.get("count");
      const search = url.searchParams.get("search") ?? "";
      let body: unknown;

      if (count === "reaction.veddra_term_name.exact") {
        body = { results: [{ term: "Vomiting", count: 7 }] };
      } else if (count === "original_receive_date") {
        body = { results: [{ time: "20240101", count: 4 }, { time: "20240601", count: 6 }] };
      } else if (url.searchParams.get("sort")) {
        body = { results: [{ unique_aer_id_number: "R1", serious_ae: "true" }] };
      } else {
        const total = search.includes('serious_ae:"true"') ? 3 : 10;
        body = {
          meta: { last_updated: "2026-10-05", results: { skip: 0, limit: 1, total } },
          results: [],
        };
      }
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as FetchFn;

    const overview = await getSafetyOverview(
      { ingredient: "lotilaner", species: "Dog" },
      { fetchFn },
    );

    expect(fetchFn).toHaveBeenCalledTimes(5);
    expect(overview.dataLastUpdated).toBe("2026-10-05");
    expect(overview.totalReports).toBe(10);
    expect(overview.seriousReports).toBe(3);
    expect(overview.topReactions).toEqual([{ term: "Vomiting", count: 7 }]);
    expect(overview.reportsByYear).toEqual([{ year: 2024, count: 10 }]);
    expect(overview.recentReports[0]).toMatchObject({ id: "R1", serious: true });
  });
});
