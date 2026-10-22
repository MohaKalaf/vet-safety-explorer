import type { Metadata } from "next";
import Link from "next/link";
import data from "@/data/signals.json";
import { SignalTable } from "@/components/SignalTable";
import { formatDay, numberFormat } from "@/lib/format";
import { pickSpecies, signalsFor, speciesList, tabLabel, type SignalSnapshot } from "@/lib/signals";

export const metadata: Metadata = {
  title: "Signals | Vet Safety Explorer",
  description: "Drug and reaction pairs reported unusually often in openFDA animal data.",
};

const snapshot = data as SignalSnapshot;

export default async function SignalsPage({ searchParams }: PageProps<"/signals">) {
  const requested = (await searchParams).species;
  const available = speciesList(snapshot);
  const species = pickSpecies(typeof requested === "string" ? requested : undefined, available);

  return (
    <main className="py-14 sm:py-20">
      <h1 className="max-w-3xl text-[2rem] leading-[1.25] font-medium tracking-tight text-balance sm:text-5xl sm:leading-[1.2]">
        Reactions reported unusually often with a drug
      </h1>

      <div className="mt-6 max-w-2xl space-y-3 leading-relaxed text-slate">
        <p>
          For each drug, this compares how often a reaction appears in its reports with how often
          it appears for every other drug given to the same species. That ratio is the
          proportional reporting ratio (PRR). A PRR of 4 means the reaction is reported four times
          as often.
        </p>
        <p>
          A pair is flagged when it has at least 3 reports, a PRR of 2 or more and a chi-square of
          4 or more, the usual screening thresholds. Drugs with fewer than 50 reports are left
          out, because their ratios swing too much.
        </p>
        <p>
          Only clinical signs count. Product complaints (a leaking tube), medication errors and
          reports that a drug didn&apos;t work are left out, as are reports with no species.
        </p>
      </div>

      {species === null ? (
        <p className="mt-16 max-w-xl">
          No signals yet. This page fills in once the data pipeline has run.
        </p>
      ) : (
        <>
          <p className="mt-10 max-w-2xl text-sm text-slate">
            From {numberFormat.format(snapshot.reports)} reports received
            {snapshot.dataFrom && snapshot.dataTo
              ? ` between ${formatDay(snapshot.dataFrom)} and ${formatDay(snapshot.dataTo)}`
              : ""}
            , processed by a PySpark pipeline on Databricks
            {snapshot.generated ? ` on ${formatDay(snapshot.generated)}` : ""}.
            <span className="hidden sm:inline"> Click a column heading to sort.</span>
          </p>

          <nav aria-label="Species" className="mt-10 flex flex-wrap gap-2 text-sm">
            {available.map((option) => (
              <Link
                key={option}
                href={`/signals?species=${encodeURIComponent(option)}`}
                aria-current={option === species ? "page" : undefined}
                className={
                  option === species
                    ? "rounded-md bg-ink px-3 py-1.5 text-paper"
                    : "rounded-md bg-bar-soft px-3 py-1.5 hover:bg-rule"
                }
              >
                {tabLabel(option)}
              </Link>
            ))}
          </nav>

          <section aria-label={`Signals in ${tabLabel(species)}`} className="mt-6">
            <SignalTable signals={signalsFor(snapshot, species)} />
          </section>
        </>
      )}

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-slate">
        A signal is a reason to look closer, not proof that a drug causes a reaction. Reports are
        voluntary, and drugs given to sicker animals tend to collect more of them.
      </p>
    </main>
  );
}
