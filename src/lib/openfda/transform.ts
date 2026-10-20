import type { RawReport, ReportSummary, TermCount, TimeCount, YearCount } from "./types";

// "20210216" -> "2021-02-16"
export function formatOpenFdaDate(value: string | undefined): string | null {
  if (!value || !/^\d{8}$/.test(value)) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

// openFDA date counts are per day
export function aggregateByYear(rows: TimeCount[]): YearCount[] {
  const totals = new Map<number, number>();
  for (const row of rows) {
    const year = Number(row.time?.slice(0, 4));
    if (!Number.isInteger(year) || year < 1900) continue;
    totals.set(year, (totals.get(year) ?? 0) + row.count);
  }
  return [...totals.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

// VeDDRA versions word some terms differently, e.g.
//   "Lethargy (see also Central nervous system depression in Neurological)"
//   "Lethargy (see also Central nervous system depression in 'Neurological')"
// Dropping the "see also" part lets them merge.
export function normaliseReactionTerm(term: string): string {
  return term
    .replace(/\s*\(see also[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeReactionCounts(rows: TermCount[], limit: number): TermCount[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const term = normaliseReactionTerm(row.term);
    if (!term) continue;
    totals.set(term, (totals.get(term) ?? 0) + row.count);
  }
  return [...totals.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit);
}

function unique(values: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value?.trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

export function toReportSummary(raw: RawReport): ReportSummary {
  const breed = raw.animal?.breed?.breed_component;

  return {
    id: raw.unique_aer_id_number ?? "unknown",
    receivedDate: formatOpenFdaDate(raw.original_receive_date),
    species: raw.animal?.species ?? "Unknown",
    breed: (Array.isArray(breed) ? breed.join(" / ") : breed) || "Unknown",
    serious: raw.serious_ae === "true",
    reporter: raw.primary_reporter ?? "Unknown",
    drugs: unique(
      (raw.drug ?? []).flatMap((d) =>
        (d.active_ingredients ?? []).map((a) => a.name),
      ),
    ),
    reactions: unique(
      (raw.reaction ?? []).map((r) =>
        r.veddra_term_name ? normaliseReactionTerm(r.veddra_term_name) : undefined,
      ),
    ),
    outcome: unique((raw.outcome ?? []).map((o) => o.medical_status))[0] ?? "Unknown",
  };
}

export function percentSerious(total: number, serious: number): number {
  if (total <= 0) return 0;
  return Math.round((serious / total) * 100);
}
