import { Suspense } from "react";
import { SearchForm, SearchFormFallback } from "@/components/SearchForm";
import { Results, ResultsSkeleton } from "@/components/Results";
import { isSearch, parseFilters, searchHref } from "@/lib/filters";

async function Explorer({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const filters = parseFilters(params);

  return (
    <>
      <SearchForm filters={filters} />
      <div className="mt-16">
        {isSearch(params) ? (
          // key resets the skeleton on every new search
          <Suspense key={searchHref(filters)} fallback={<ResultsSkeleton />}>
            <Results filters={filters} />
          </Suspense>
        ) : (
          <p className="max-w-xl text-slate">
            Fill in either blank, or leave both empty to see every report, then search.
            Results come from the US FDA&apos;s public database of animal drug side-effect
            reports.
          </p>
        )}
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/">) {
  return (
    <main className="py-14 sm:py-20">
      <Suspense fallback={<SearchFormFallback />}>
        <Explorer {...props} />
      </Suspense>
    </main>
  );
}
