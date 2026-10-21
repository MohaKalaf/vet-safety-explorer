import { getCachedSafetyOverview } from "@/lib/openfda/data";
import { OpenFdaError } from "@/lib/openfda/client";
import { percentSerious } from "@/lib/openfda/transform";
import { speciesLabel } from "@/lib/filters";
import { formatDay, numberFormat } from "@/lib/format";
import type { SafetyOverview, SearchFilters } from "@/lib/openfda/types";
import { ReactionBars } from "./ReactionBars";
import { YearColumns } from "./YearColumns";
import { ReportTable } from "./ReportTable";

function describeSearch(filters: SearchFilters): string {
  const drug = filters.ingredient ?? "any drug";
  return `${drug} in ${speciesLabel(filters.species)}`;
}

export async function Results({ filters }: { filters: SearchFilters }) {
  let overview: SafetyOverview;
  try {
    overview = await getCachedSafetyOverview(filters);
  } catch (error) {
    const message =
      error instanceof OpenFdaError
        ? error.message
        : "Couldn't reach openFDA. Check your connection and try again.";
    return (
      <p role="alert" className="rounded-md border border-signal/40 bg-signal-soft px-4 py-3 text-signal">
        {message}
      </p>
    );
  }

  if (overview.totalReports === 0) {
    return (
      <div className="max-w-xl">
        <p className="text-lg">No reports found for {describeSearch(filters)}.</p>
        <p className="mt-2 text-slate">
          Check the spelling of the active ingredient (for example lotilaner, not the brand
          name), or widen the search to any animal.
        </p>
      </div>
    );
  }

  const firstYear = overview.reportsByYear[0]?.year;
  const pct = percentSerious(overview.totalReports, overview.seriousReports);
  const topReaction = overview.topReactions[0]?.term;
  const lastUpdated = overview.dataLastUpdated;

  return (
    <div className="space-y-14">
      <section aria-labelledby="summary-heading" className="max-w-3xl">
        <h2 id="summary-heading" className="sr-only">Summary</h2>
        <p className="text-xl leading-relaxed sm:text-2xl">
          {numberFormat.format(overview.totalReports)} reports
          {firstYear ? ` since ${firstYear}` : ""}.{" "}
          <span className="text-signal">
            {numberFormat.format(overview.seriousReports)} ({pct}%) were marked serious.
          </span>
          {topReaction ? ` The most reported reaction is ${topReaction.toLowerCase()}.` : ""}
        </p>
        <p className="mt-3 text-sm text-slate">
          A report means a reaction was noticed after the drug was given. It doesn&apos;t prove
          the drug caused it.
          {lastUpdated ? ` Data last updated ${formatDay(lastUpdated)}.` : ""}
        </p>
      </section>

      <div className="grid gap-12 md:grid-cols-2">
        <section aria-labelledby="reactions-heading">
          <h2 id="reactions-heading" className="mb-4 text-lg font-medium">
            Most reported reactions
          </h2>
          <ReactionBars reactions={overview.topReactions} />
        </section>
        <section aria-labelledby="years-heading">
          <h2 id="years-heading" className="mb-4 text-lg font-medium">
            Reports received per year
          </h2>
          <YearColumns
            years={overview.reportsByYear}
            lastUpdatedYear={lastUpdated ? Number(lastUpdated.slice(0, 4)) : null}
          />
        </section>
      </div>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="mb-4 text-lg font-medium">
          Latest reports
        </h2>
        <ReportTable reports={overview.recentReports} />
      </section>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="animate-pulse space-y-14 motion-reduce:animate-none" aria-label="Loading results">
      <div className="h-8 max-w-2xl rounded bg-bar-soft" />
      <div className="grid gap-12 md:grid-cols-2">
        <div className="h-56 rounded bg-bar-soft" />
        <div className="h-56 rounded bg-bar-soft" />
      </div>
      <div className="h-64 rounded bg-bar-soft" />
    </div>
  );
}
