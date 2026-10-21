# Vet Safety Explorer

A web app for exploring side-effect reports for veterinary medicines. Pick an
active ingredient and a species, and it shows how many reports there are, what
share were serious, the most reported reactions, the yearly trend and the
latest individual reports.

The data is the US FDA's public database of animal drug adverse events,
accessed through the [openFDA API](https://open.fda.gov/apis/animalandveterinary/event/).
Tracking these reports after a drug goes on sale is called **pharmacovigilance**.

Live at **https://vetsafety.mohammadkalaf.com**

## Tech stack

| Part | Tool | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Pages and server code in one project |
| Language | TypeScript | Catches type mistakes before the code runs |
| Styling | Tailwind CSS 4 | Styles written next to the markup they affect |
| Tests | Vitest | Fast unit tests for the data logic |
| Data | openFDA REST API | Free, public, no login needed |
| Hosting | Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) | Runs the server code close to users; free tier |
| Cache | Workers KV | Stores cached openFDA results between requests |
| CI/CD | GitHub Actions | Checks every push, deploys `main` |
| Pipeline | PySpark on Databricks (Free Edition) | Bronze/silver/gold tables and signal detection |
| Pipeline tests | pytest with local Spark | Same transforms tested in CI without Databricks |

## Run it locally

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install      # download the libraries listed in package.json
npm run dev      # start a local server at http://localhost:3000
```

Other commands:

```bash
npm test             # run the unit tests once
npm run test:watch   # re-run tests every time you save a file
npm run lint         # check code style
npm run typecheck    # check TypeScript types
npm run build        # build the production version
```

An openFDA API key is optional. To use one, copy `.env.example` to
`.env.local` and fill it in.

## How it works

1. **The search lives in the URL.** Searching for lotilaner in dogs goes to
   `/?ingredient=lotilaner&species=Dog`, so every search can be bookmarked or
   shared. `src/lib/filters.ts` reads and cleans these values. Searching with
   both blanks empty shows every report; a fresh visit makes no requests.
2. **The server asks openFDA five questions at once:** the total number of
   reports, the number of serious ones, the top reactions, reports per day,
   and the 10 newest reports. They run in parallel with `Promise.all`.
   See `getSafetyOverview` in `src/lib/openfda/client.ts`.
3. **The answers are tidied up** by pure functions in
   `src/lib/openfda/transform.ts`, e.g. adding daily counts up into years.
4. **Results are cached for a few hours** (`src/lib/openfda/data.ts`), because
   openFDA updates weekly and has a daily request limit.
5. **The page streams.** The form appears straight away and the results stream
   in behind a loading skeleton (`<Suspense>` in `src/app/page.tsx`).

```
pipeline/                 PySpark pipeline (see "Data pipeline" below)
.github/workflows/ci.yml  checks and deploy
wrangler.jsonc            Cloudflare Worker config
open-next.config.ts       Next.js to Workers adapter config
scripts/
  update-ingredients.mjs  refreshes the drug suggestion snapshot
src/
  app/
    page.tsx            the home page
    layout.tsx          wraps every page: fonts, <html>, <body>
    globals.css         colour tokens and base styles
  components/           the pieces of the page (form, charts, table)
  data/
    ingredient-counts.json  snapshot of openFDA's most-reported ingredients
  lib/
    filters.ts          reading the search from the URL
    ingredients.ts      cleaning ingredient names for suggestions
    openfda/
      types.ts          the shape of openFDA's data
      query.ts          building openFDA request URLs safely
      client.ts         fetching from openFDA
      transform.ts      reshaping raw data for the UI
      data.ts           cached version used by the page
      *.test.ts         unit tests
```

## Design decisions

- **Network code takes a `fetchFn` argument.** Tests pass in a fake `fetch`,
  so they run in under a second and never depend on openFDA being up.
- **openFDA's "404 Not Found" is not treated as an error.** openFDA uses it to
  mean "no matches", which is a normal result for a search.
- **User input is sanitised** before going into an openFDA query, so typing
  quotes or colons can't change the meaning of the search.
- **Drug suggestions come from a snapshot**, not a live request, so loading the
  page never calls openFDA. openFDA's raw names mix in doses, salts and
  combinations ("Ivermectin/Pyrantel Pamoate Chewable 272Mcg/652Mg"), so
  `src/lib/ingredients.ts` reduces them to base names before ranking. Refresh
  the snapshot with `node scripts/update-ingredients.mjs`.
- **Charts are plain HTML and CSS** rather than a charting library: fewer
  dependencies, server-rendered, and easy to read.
- **The "partial year" note uses openFDA's last-updated date**, not the
  server clock, so it follows the data rather than the calendar.
- **Cache Components is switched off.** On Cloudflare Workers its staged
  rendering hangs requests, a known adapter bug
  ([opennextjs-cloudflare#1318](https://github.com/opennextjs/opennextjs-cloudflare/pull/1318)).
  Caching uses `unstable_cache` instead, stored in Workers KV.

## Deployment

Every push and pull request runs lint, type check, tests and a build in GitHub
Actions. When those pass on `main`, the app is built for Cloudflare Workers
and deployed automatically.

To try the Workers build locally (Linux, macOS or WSL):

```bash
npm run preview
```

## Data pipeline

`pipeline/` is a PySpark pipeline packaged as a Python wheel and run as a
five-task Databricks Job on serverless compute, defined as code in
`pipeline/databricks.yml`:

```
setup → bronze → silver → gold → export
```

| Layer | Tables | What happens |
| --- | --- | --- |
| Bronze | `bronze_reports` | openFDA's quarterly JSON files read with an explicit schema; source file and load time kept |
| Silver | `silver_reports`, `silver_report_ingredients`, `silver_report_reactions`, `silver_quality_checks` | Duplicates resolved (newest file wins), dates typed, ingredient and reaction names cleaned, data-quality checks run |
| Gold | `gold_monthly_counts`, `gold_ingredient_features`, `gold_signals` | Monthly counts, a per-drug feature table (volume, serious share, 3-month trend) and disproportionality signals |

**Signals** use the proportional reporting ratio (PRR), stratified by species,
with a 95% confidence interval and Yates-corrected chi-square. A pair is
flagged at 3+ cases, PRR ≥ 2 and chi-square ≥ 4 (Evans et al., 2001). The
`export` task writes flagged signals to `signals.json`, which the site's
`/signals` page reads.

**Data quality.** Silver stops the job if more than a set share of reports
have no ID, an unparseable date, no usable ingredient or no reaction. Results
are saved to `silver_quality_checks` first, so a failed run still shows why.

**Name cleaning** is the same logic as the site's `src/lib/ingredients.ts`,
written with Spark's built-in functions rather than a Python UDF, so it runs
in the JVM. Both test suites share the same test cases.

### Running it

1. Deploy the job: `cd pipeline && databricks bundle deploy`. This builds the
   wheel (needs Python locally) and uploads it with the job definition.
2. Run it: `databricks bundle run vetsafety_pipeline`. The `setup` task creates
   the schema and volumes, then downloads from openFDA.
3. Databricks Free Edition blocks most outbound internet. If the download is
   blocked, `setup` fails with a message saying so. Download locally from the
   `pipeline` folder with `python -m vetsafety.download --since 2023q1`, upload
   `raw/*.json` to the `workspace.vetsafety.raw` volume, and run the job again.
4. Copy `/Volumes/workspace/vetsafety/exports/signals.json` to
   `src/data/signals.json` and commit it.

The job ships as a wheel rather than loose `.py` files because importing
modules straight from workspace storage failed on Databricks with
`OSError: [Errno 5]`. A wheel is installed before the task starts, so nothing
is read from workspace storage at run time.

Tests run locally and in CI without Databricks:

```bash
cd pipeline
pip install -r requirements-dev.txt   # needs Java 17+
python -m pytest tests
```

## Limitations

- A report means a reaction was noticed after a drug was given. It does not
  prove the drug caused it, and report counts depend on how widely a drug is
  used, so raw counts can't fairly compare two drugs.
- The data is mostly from the US and is unverified.
- Searches match the active ingredient, not brand names.
- PRR compares reporting rates, not risk. A high PRR can come from how a drug is
  used (e.g. in already-sick animals) rather than the drug itself.

## Data

Data from openFDA, provided by the US Food and Drug Administration. Not for
clinical decisions.
