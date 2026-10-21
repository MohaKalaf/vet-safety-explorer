"""Entry point for each Databricks job task: python jobs/run.py <stage>"""

import json
import sys
from pathlib import Path

# Serverless runs this via exec() with no __file__, so databricks.yml passes the
# bundle root as the 2nd argument. __file__ is only the fallback for local runs.
ROOT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pyspark.sql import DataFrame, SparkSession  # noqa: E402

from download import download  # noqa: E402
from vetsafety import bronze, export, gold, quality, silver  # noqa: E402
from vetsafety.config import CATALOG, EXPORT_DIR, RAW_DIR, SCHEMA, table  # noqa: E402


def save(df: DataFrame, name: str) -> None:
    df.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(table(name))
    print(f"{table(name)}: {spark.table(table(name)).count()} rows")


def setup(since: str = "2023q1") -> None:
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")
    spark.sql(f"CREATE VOLUME IF NOT EXISTS {CATALOG}.{SCHEMA}.raw")
    spark.sql(f"CREATE VOLUME IF NOT EXISTS {CATALOG}.{SCHEMA}.exports")
    try:
        download(since, Path(RAW_DIR))
    except Exception as error:  # Free Edition blocks most outbound internet
        if not any(Path(RAW_DIR).glob("*.json")):
            raise RuntimeError(
                f"Couldn't download from openFDA ({error}). Run pipeline/download.py "
                f"locally and upload the JSON files to {RAW_DIR}, then rerun."
            ) from error
        print(f"Download failed ({error}); using the files already in {RAW_DIR}")


def run_bronze() -> None:
    save(bronze.read_raw(spark, RAW_DIR), "bronze_reports")


def run_silver() -> None:
    raw = spark.table(table("bronze_reports"))
    latest = silver.latest_reports(raw)
    save(silver.reports(latest), "silver_reports")
    save(silver.report_ingredients(latest), "silver_report_ingredients")
    save(silver.report_reactions(latest), "silver_report_reactions")

    # saved before raising, so a failed run still shows which check failed
    checks = quality.run_checks(
        raw,
        spark.table(table("silver_reports")),
        spark.table(table("silver_report_ingredients")),
        spark.table(table("silver_report_reactions")),
    )
    save(quality.as_dataframe(spark, checks), "silver_quality_checks")
    quality.raise_if_failed(checks)


def run_gold() -> None:
    reports = spark.table(table("silver_reports"))
    ingredients = spark.table(table("silver_report_ingredients"))
    reactions = spark.table(table("silver_report_reactions"))

    save(gold.monthly_counts(reports, ingredients), "gold_monthly_counts")
    save(gold.features(spark.table(table("gold_monthly_counts"))), "gold_ingredient_features")
    save(gold.signals(reports, ingredients, reactions), "gold_signals")


def run_export() -> None:
    snapshot = export.build_snapshot(
        spark.table(table("gold_signals")), spark.table(table("silver_reports"))
    )
    target = Path(EXPORT_DIR) / "signals.json"
    target.write_text(json.dumps(snapshot, indent=2) + "\n")
    print(f"{target}: {len(snapshot['signals'])} signals")


STAGES = {"setup": setup, "bronze": run_bronze, "silver": run_silver, "gold": run_gold, "export": run_export}

# No `if __name__ == "__main__"` guard: under the serverless runner it isn't
# reliably true, and a skipped stage would still report success.
spark = SparkSession.builder.getOrCreate()
STAGES[sys.argv[1]]()
