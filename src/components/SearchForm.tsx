// next/form: submits to the URL with client-side nav, still works without JS.

import Form from "next/form";
import Link from "next/link";
import snapshot from "@/data/ingredient-counts.json";
import {
  EXAMPLE_SEARCHES,
  SPECIES_OPTIONS,
  searchHref,
  speciesLabel,
} from "@/lib/filters";
import { topIngredients } from "@/lib/ingredients";
import type { SearchFilters } from "@/lib/openfda/types";

const SUGGESTIONS = topIngredients(snapshot.results, 40);

// Tinted box + dashed underline so the blanks read as editable, not as text.
const fieldClass =
  "rounded-t-md border-b-2 border-dashed border-ink/40 bg-bar-soft px-2 text-signal " +
  "outline-none transition-colors hover:border-ink/70 focus:border-solid focus:border-signal";

export function SearchForm({ filters }: { filters: SearchFilters }) {
  return (
    <div>
      <Form action="/" className="max-w-4xl">
        <h1 className="text-[2rem] leading-[1.35] font-medium tracking-tight text-balance sm:text-5xl sm:leading-[1.3]">
          Side effects reported for{" "}
          <label htmlFor="ingredient" className="sr-only">
            Active ingredient
          </label>
          <input
            id="ingredient"
            name="ingredient"
            list="ingredient-suggestions"
            defaultValue={filters.ingredient ?? ""}
            placeholder="type a drug"
            autoComplete="off"
            spellCheck={false}
            maxLength={60}
            className={`${fieldClass} w-[10ch] min-w-[5ch] supports-[field-sizing:content]:w-auto [field-sizing:content] placeholder:text-slate`}
          />{" "}
          in{" "}
          <label htmlFor="species" className="sr-only">
            Species
          </label>
          <span className="relative inline-block">
            <select
              id="species"
              name="species"
              defaultValue={filters.species ?? ""}
              className={`${fieldClass} cursor-pointer appearance-none pr-[1.1em] [field-sizing:content]`}
            >
              {SPECIES_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="text-base text-ink">
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 12 12"
              className="pointer-events-none absolute top-1/2 right-[0.3em] h-[0.45em] w-[0.45em] -translate-y-1/2 text-signal"
            >
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <datalist id="ingredient-suggestions">
          {SUGGESTIONS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

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
