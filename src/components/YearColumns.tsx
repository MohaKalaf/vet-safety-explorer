import type { YearCount } from "@/lib/openfda/types";

const numberFormat = new Intl.NumberFormat("en-GB");
const MAX_YEARS = 15;

export function YearColumns({
  years,
  lastUpdatedYear,
}: {
  years: YearCount[];
  // openFDA's last refresh year, i.e. still incomplete
  lastUpdatedYear: number | null;
}) {
  if (years.length === 0) {
    return <p className="text-sm text-slate">No dated reports for this search.</p>;
  }

  const shown = years.slice(-MAX_YEARS);
  const max = Math.max(...shown.map((y) => y.count));
  const latestYear = shown[shown.length - 1].year;

  return (
    <figure>
      <div className="flex h-44 items-end gap-1 border-b border-rule">
        {shown.map((y) => (
          <div
            key={y.year}
            className="group relative flex h-full flex-1 flex-col justify-end"
            title={`${y.year}: ${numberFormat.format(y.count)} reports`}
          >
            <div
              className="rounded-t-sm bg-bar transition-opacity group-hover:opacity-75"
              style={{ height: `${Math.max(1, (y.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate">
        <span>{shown[0].year}</span>
        <span>{latestYear}</span>
      </div>
      <figcaption className="sr-only">
        Reports per year:{" "}
        {shown.map((y) => `${y.year}, ${numberFormat.format(y.count)}`).join("; ")}
      </figcaption>
      {latestYear === lastUpdatedYear ? (
        <p className="mt-3 text-xs text-slate">{latestYear} only counts reports received so far.</p>
      ) : null}
    </figure>
  );
}
