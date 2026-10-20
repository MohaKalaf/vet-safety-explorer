import { describe, expect, it } from "vitest";
import {
  aggregateByYear,
  formatOpenFdaDate,
  mergeReactionCounts,
  normaliseReactionTerm,
  percentSerious,
  toReportSummary,
} from "./transform";
import type { RawReport } from "./types";

describe("formatOpenFdaDate", () => {
  it("converts YYYYMMDD to YYYY-MM-DD", () => {
    expect(formatOpenFdaDate("20210216")).toBe("2021-02-16");
  });

  it("returns null for missing or malformed dates", () => {
    expect(formatOpenFdaDate(undefined)).toBeNull();
    expect(formatOpenFdaDate("2021")).toBeNull();
    expect(formatOpenFdaDate("2021-02-16")).toBeNull();
  });
});

describe("aggregateByYear", () => {
  it("adds daily counts up into years, oldest first", () => {
    expect(
      aggregateByYear([
        { time: "20220105", count: 2 },
        { time: "20210216", count: 3 },
        { time: "20220301", count: 4 },
      ]),
    ).toEqual([
      { year: 2021, count: 3 },
      { year: 2022, count: 6 },
    ]);
  });

  it("skips rows with unusable dates", () => {
    expect(
      aggregateByYear([
        { time: "abcd0101", count: 9 },
        { time: "00000101", count: 9 },
        { time: "20200101", count: 1 },
      ]),
    ).toEqual([{ year: 2020, count: 1 }]);
  });

  it("returns an empty list for no data", () => {
    expect(aggregateByYear([])).toEqual([]);
  });
});

describe("toReportSummary", () => {
  // Trimmed from a real report
  const raw: RawReport = {
    unique_aer_id_number: "USA-USFDACVM-2021-US-006991",
    original_receive_date: "20210216",
    serious_ae: "true",
    primary_reporter: "Animal Owner",
    animal: {
      species: "Dog",
      breed: { breed_component: "Bulldog - French" },
    },
    drug: [{ active_ingredients: [{ name: "Afoxolaner" }] }],
    reaction: [
      { veddra_term_name: "Vomiting" },
      { veddra_term_name: "Diarrhoea" },
      { veddra_term_name: "Vomiting" },
    ],
    outcome: [{ medical_status: "Recovered/Normal" }],
  };

  it("pulls out the fields the UI shows", () => {
    expect(toReportSummary(raw)).toEqual({
      id: "USA-USFDACVM-2021-US-006991",
      receivedDate: "2021-02-16",
      species: "Dog",
      breed: "Bulldog - French",
      serious: true,
      reporter: "Animal Owner",
      drugs: ["Afoxolaner"],
      reactions: ["Vomiting", "Diarrhoea"],
      outcome: "Recovered/Normal",
    });
  });

  it("joins mixed breeds", () => {
    const summary = toReportSummary({
      animal: { breed: { breed_component: ["Poodle", "Labrador"] } },
    });
    expect(summary.breed).toBe("Poodle / Labrador");
  });

  it("fills sensible defaults for an empty report", () => {
    expect(toReportSummary({})).toEqual({
      id: "unknown",
      receivedDate: null,
      species: "Unknown",
      breed: "Unknown",
      serious: false,
      reporter: "Unknown",
      drugs: [],
      reactions: [],
      outcome: "Unknown",
    });
  });
});

describe("normaliseReactionTerm", () => {
  it("drops the 'see also' cross-reference", () => {
    expect(
      normaliseReactionTerm(
        "Lethargy (see also Central nervous system depression in 'Neurological')",
      ),
    ).toBe("Lethargy");
  });

  it("leaves other brackets alone", () => {
    expect(normaliseReactionTerm("Lack of efficacy (ectoparasite) - tick NOS")).toBe(
      "Lack of efficacy (ectoparasite) - tick NOS",
    );
  });
});

describe("mergeReactionCounts", () => {
  // Real rows, lotilaner in dogs
  const rows = [
    { term: "Vomiting", count: 3508 },
    { term: "Diarrhoea", count: 1736 },
    { term: "Other abnormal test result NOS", count: 929 },
    { term: "Lethargy (see also Central nervous system depression in Neurological)", count: 747 },
    { term: "Lethargy (see also Central nervous system depression in 'Neurological')", count: 625 },
  ];

  it("merges differently worded versions of the same reaction", () => {
    expect(mergeReactionCounts(rows, 10)).toEqual([
      { term: "Vomiting", count: 3508 },
      { term: "Diarrhoea", count: 1736 },
      { term: "Lethargy", count: 1372 },
      { term: "Other abnormal test result NOS", count: 929 },
    ]);
  });

  it("returns at most `limit` rows", () => {
    expect(mergeReactionCounts(rows, 2)).toHaveLength(2);
  });
});

describe("percentSerious", () => {
  it("rounds to a whole percentage", () => {
    expect(percentSerious(3, 1)).toBe(33);
  });

  it("returns 0 when there are no reports", () => {
    expect(percentSerious(0, 0)).toBe(0);
  });
});
