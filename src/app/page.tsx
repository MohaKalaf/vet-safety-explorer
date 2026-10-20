import { Suspense } from "react";
import Link from "next/link";
import { SearchForm, SearchFormFallback } from "@/components/SearchForm";
import { Results, ResultsSkeleton } from "@/components/Results";
import { hasFilters, parseFilters, searchHref } from "@/lib/filters";

async function Explorer({ searchParams }: PageProps<"/">) {
  const filters = parseFilters(await searchParams);

  return (
    <>
      <SearchForm filters={filters} />
      <div className="mt-16">
        {hasFilters(filters) ? (
          // key resets the skeleton on every new search
          <Suspense key={searchHref(filters)} fallback={<ResultsSkeleton />}>
            <Results filters={filters} />
          </Suspense>
        ) : (
          <p className="max-w-xl text-slate">
            Type an active ingredient, pick a species, then search. Results come from the US
            FDA&apos;s public database of animal drug side-effect reports.
          </p>
        )}
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/">) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8">
      <header className="flex items-baseline justify-between border-b border-rule py-5">
        <Link href="/" className="font-medium">
          Vet Safety Explorer
        </Link>
        <span className="hidden text-sm text-slate sm:inline">Veterinary pharmacovigilance data</span>
      </header>

      <main className="py-14 sm:py-20">
        <Suspense fallback={<SearchFormFallback />}>
          <Explorer {...props} />
        </Suspense>
      </main>

      <footer className="border-t border-rule py-8 text-sm leading-relaxed text-slate">
        <p className="max-w-2xl">
          Data from{" "}
          <a
            href="https://open.fda.gov/apis/animalandveterinary/event/"
            className="underline underline-offset-4 hover:text-ink"
          >
            openFDA
          </a>
          , the US Food and Drug Administration&apos;s public API. Reports are unverified and
          mostly from the US. Don&apos;t use this site to make decisions about an
          animal&apos;s care; ask a vet.
        </p>
      </footer>
    </div>
  );
}
