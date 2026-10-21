"""Data-quality checks on silver. Results are saved as a table and can stop the job."""

from dataclasses import dataclass

from pyspark.sql import DataFrame
from pyspark.sql import functions as F


@dataclass
class Check:
    name: str
    failed: int
    total: int
    max_share: float  # job fails if failed / total goes above this

    @property
    def passed(self) -> bool:
        return self.total == 0 or self.failed / self.total <= self.max_share


def run_checks(
    bronze: DataFrame, reports: DataFrame, ingredients: DataFrame, reactions: DataFrame
) -> list[Check]:
    bronze_rows = bronze.count()
    total = reports.count()
    no_id = bronze.where(
        F.col("unique_aer_id_number").isNull() | (F.trim("unique_aer_id_number") == "")
    ).count()
    with_ingredient = ingredients.select("report_id").distinct().count()
    with_reaction = reactions.select("report_id").distinct().count()

    return [
        Check("missing report id", no_id, bronze_rows, 0.01),
        # duplicates are expected (follow-up reports) and resolved in silver; tracked only
        Check("duplicate report ids", bronze_rows - no_id - total, bronze_rows, 1.0),
        Check("unparseable receive date", reports.where("received_date IS NULL").count(), total, 0.01),
        # some reports only name a vaccine or "Unknown", which cleaning drops
        Check("no usable ingredient", total - with_ingredient, total, 0.25),
        Check("no reaction", total - with_reaction, total, 0.05),
    ]


def as_dataframe(spark, checks: list[Check]) -> DataFrame:
    rows = [(c.name, c.failed, c.total, c.max_share, c.passed) for c in checks]
    return spark.createDataFrame(rows, "check string, failed long, total long, max_share double, passed boolean")


def raise_if_failed(checks: list[Check]) -> None:
    failures = [c for c in checks if not c.passed]
    if failures:
        detail = "; ".join(f"{c.name}: {c.failed}/{c.total}" for c in failures)
        raise ValueError(f"Data quality checks failed: {detail}")
