// next/form: submits to the URL with client-side nav, still works without JS.

import Form from "next/form";
import Link from "next/link";
import {
  EXAMPLE_SEARCHES,
  SPECIES_OPTIONS,
  searchHref,
  speciesLabel,
} from "@/lib/filters";
import type { SearchFilters } from "@/lib/openfda/types";

const fieldClass =
  "border-b-2 border-ink/30 bg-transparent px-1 text-signal outline-none " +
  "transition-colors hover:border-ink/60 focus:border-signal";

export function SearchForm({ filters }: { filters: SearchFilters }) {
  return (
    <div>
      <Form action="/" className="max-w-4xl">
        <h1 className="text-[2rem] leading-[1.25] font-medium tracking-tight text-balance sm:text-5xl sm:leading-[1.2]">
          Side effects reported for{" "}
          <label htmlFor="ingredient" className="sr-only">
            Active ingredient
          </label>
          <input
            id="ingredient"
            name="ingredient"
            defaultValue={filters.ingredient ?? ""}
            placeholder="any drug"
            autoComplete="off"
            spellCheck={false}
            maxLength={60}
            className={`${fieldClass} w-[9ch] min-w-[5ch] supports-[field-sizing:content]:w-auto [field-sizing:content] placeholder:text-slate/60`}
          />{" "}
          in{" "}
          <label htmlFor="species" className="sr-only">
            Species
          </label>
          <select
            id="species"
            name="species"
            defaultValue={filters.species ?? ""}
            className={`${fieldClass} cursor-pointer appearance-none [field-sizing:content]`}
          >
            {SPECIES_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="text-base text-ink">
                {option.label}
              </option>
            ))}
          </select>
        </h1>

        <button
          type="submit"
          className="mt-8 rounded-md bg-ink px-5 py-2.5 text-base font-medium text-paper transition-opacity hover:opacity-85"
        >
          Search reports
        </button>
      </Form>

      <p className="mt-6 text-sm text-slate">
        Or compare flea and tick medicines:{" "}
        {EXAMPLE_SEARCHES.map((example, i) => (
          <span key={searchHref(example)}>
            <Link
              href={searchHref(example)}
              className="text-ink underline decoration-rule underline-offset-4 hover:decoration-signal"
            >
              {example.ingredient} in {speciesLabel(example.species)}
            </Link>
            {i < EXAMPLE_SEARCHES.length - 1 ? ", " : ""}
          </span>
        ))}
      </p>
    </div>
  );
}

// Same layout as the real form so nothing shifts once params resolve.
export function SearchFormFallback() {
  return <SearchForm filters={{}} />;
}
