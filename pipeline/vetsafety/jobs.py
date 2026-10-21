"""Entry point for each Databricks job task: vetsafety-job <stage>"""

import json
import sys
from pathlib import Path

from pyspark.sql import DataFrame, SparkSession

from vetsafety import bronze, config, export, gold, quality, silver
from vetsafety.download import download


def save(spark: SparkSession, df: DataFrame, name: str) -> None:
    df.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(config.table(name))
    print(f"{config.table(name)}: {spark.table(config.table(name)).count()} rows")


def setup(spark: SparkSession, since: str = "2023q1") -> None:
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {config.CATALOG}.{config.SCHEMA}")
    spark.sql(f"CREATE VOLUME IF NOT EXISTS {config.CATALOG}.{config.SCHEMA}.raw")
    spark.sql(f"CREATE VOLUME IF NOT EXISTS {config.CATALOG}.{config.SCHEMA}.exports")
    raw = Path(config.RAW_DIR)
    try:
        download(since, raw)
    except Exception as error:  # Free Edition blocks most outbound internet
        if not any(raw.glob("*.json")):
            raise RuntimeError(
                f"Couldn't download from openFDA ({error}). Run "
                f"`python -m vetsafety.download` locally and upload the JSON files "
                f"to {raw}, then rerun."
            ) from error
        print(f"Download failed ({error}); using the files already in {raw}")


def run_bronze(spark: SparkSession) -> None:
    save(spark, bronze.read_raw(spark, config.RAW_DIR), "bronze_reports")


def run_silver(spark: SparkSession) -> None:
    raw = spark.table(config.table("bronze_reports"))
    latest = silver.latest_reports(raw)
    save(spark, silver.reports(latest), "silver_reports")
    save(spark, silver.report_ingredients(latest), "silver_report_ingredients")
    save(spark, silver.report_reactions(latest), "silver_report_reactions")

    # saved before raising, so a failed run still shows which check failed
    checks = quality.run_checks(
        raw,
        spark.table(config.table("silver_reports")),
        spark.table(config.table("silver_report_ingredients")),
        spark.table(config.table("silver_report_reactions")),
    )
    save(spark, quality.as_dataframe(spark, checks), "silver_quality_checks")
    quality.raise_if_failed(checks)


def run_gold(spark: SparkSession) -> None:
    reports = spark.table(config.table("silver_reports"))
    ingredients = spark.table(config.table("silver_report_ingredients"))
    reactions = spark.table(config.table("silver_report_reactions"))

    save(spark, gold.monthly_counts(reports, ingredients), "gold_monthly_counts")
    monthly = spark.table(config.table("gold_monthly_counts"))
    save(spark, gold.features(monthly), "gold_ingredient_features")
    save(spark, gold.signals(reports, ingredients, reactions), "gold_signals")


def run_export(spark: SparkSession) -> None:
    snapshot = export.build_snapshot(
        spark.table(config.table("gold_signals")),
        spark.table(config.table("silver_reports")),
    )
    target = Path(config.EXPORT_DIR) / "signals.json"
    target.write_text(json.dumps(snapshot, indent=2) + "\n")
    print(f"{target}: {len(snapshot['signals'])} signals")


STAGES = {
    "setup": setup,
    "bronze": run_bronze,
    "silver": run_silver,
    "gold": run_gold,
    "export": run_export,
}


def main() -> None:
    stage = sys.argv[1]
    if stage not in STAGES:
        raise SystemExit(f"Unknown stage {stage!r}. Choose from: {', '.join(STAGES)}")
    STAGES[stage](SparkSession.builder.getOrCreate())
