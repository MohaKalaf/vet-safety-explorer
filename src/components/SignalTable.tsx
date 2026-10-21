import Link from "next/link";
import { searchHref } from "@/lib/filters";
import { numberFormat } from "@/lib/format";
import type { Signal } from "@/lib/signals";

const THRESHOLD = 2;

// Log scale from 1: ratios are multiplicative, so 2→4 should look like 4→8.
// Upper bound rounds up to a power of ten so the scale is stable between rows.
function scaleMax(signals: Signal[]): number {
  const highest = Math.max(...signals.map((s) => s.ciHigh));
  return Math.min(1000, Math.max(10, 10 ** Math.ceil(Math.log10(highest))));
}

function position(value: number, max: number): number {
  return Math.min(100, Math.max(0, (Math.log(value) / Math.log(max)) * 100));
}

function IntervalBar({ signal, max }: { signal: Signal; max: number }) {
  const low = position(signal.ciLow, max);
  const high = position(signal.ciHigh, max);
  return (
    <div className="relative h-4 w-full min-w-28" aria-hidden="true">
      <div
        className="absolute top-0 bottom-0 border-l border-dashed border-slate/50"
        style={{ left: `${position(THRESHOLD, max)}%` }}
      />
      <div
        className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-bar"
        style={{ left: `${low}%`, width: `${Math.max(high - low, 0.5)}%` }}
      />
      <div
        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal"
        style={{ left: `${position(signal.prr, max)}%` }}
      />
    </div>
  );
}

function ratio(value: number): string {
  return value >= 100 ? numberFormat.format(Math.round(value)) : value.toFixed(1);
}

function DrugLink({ signal }: { signal: Signal }) {
  return (
    <Link
      href={searchHref({ ingredient: signal.ingredient, species: signal.species })}
      className="font-medium underline decoration-rule underline-offset-4 hover:decoration-signal"
    >
      {signal.ingredient}
    </Link>
  );
}

export function SignalTable({ signals }: { signals: Signal[] }) {
  const max = scaleMax(signals);

  return (
    <>
      {/* 5 columns don't fit on phones */}
      <ul className="divide-y divide-rule border-y border-rule text-sm sm:hidden">
        {signals.map((s) => (
          <li key={`${s.ingredient}|${s.reaction}`} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <DrugLink signal={s} />
              <span className="shrink-0">PRR {ratio(s.prr)}</span>
            </div>
            <p className="mt-1">{s.reaction}</p>
            <p className="mt-1 text-slate">
              {numberFormat.format(s.cases)} of {numberFormat.format(s.ingredientReports)} reports.
              95% CI {ratio(s.ciLow)} to {ratio(s.ciHigh)}
            </p>
          </li>
        ))}
      </ul>

      <table className="hidden w-full text-left text-sm sm:table">
        <thead className="text-slate">
          <tr className="border-b border-rule">
            <th scope="col" className="py-2 pr-4 font-normal">Drug</th>
            <th scope="col" className="py-2 pr-4 font-normal">Reaction</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">Reports</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">PRR</th>
            <th scope="col" className="w-1/4 py-2 font-normal">95% CI</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr key={`${s.ingredient}|${s.reaction}`} className="border-b border-rule align-middle">
              <td className="py-3 pr-4">
                <DrugLink signal={s} />
              </td>
              <td className="py-3 pr-4">{s.reaction}</td>
              <td className="py-3 pr-4 text-right whitespace-nowrap">
                {numberFormat.format(s.cases)}
                <span className="text-slate"> / {numberFormat.format(s.ingredientReports)}</span>
              </td>
              <td className="py-3 pr-4 text-right">{ratio(s.prr)}</td>
              <td className="py-3">
                <span className="sr-only">
                  {ratio(s.ciLow)} to {ratio(s.ciHigh)}
                </span>
                <IntervalBar signal={s} max={max} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} />
            <td className="pt-1.5 text-xs text-slate">
              <div className="flex justify-between" aria-hidden="true">
                <span>1</span>
                <span>dashed line: PRR 2</span>
                <span>{numberFormat.format(max)}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}
