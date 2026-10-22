"""Silver: deduplicated, typed reports split into reports / ingredients / reactions."""

from pyspark.sql import DataFrame, Window
from pyspark.sql import functions as F

from vetsafety.names import ingredient_names, reaction_category, reaction_name


def latest_reports(bronze: DataFrame) -> DataFrame:
    """One row per report id. If an id is in several files, the newest file wins."""
    newest_first = Window.partitionBy("report_id").orderBy(F.col("_source_file").desc())
    return (
        bronze.withColumn("report_id", F.trim("unique_aer_id_number"))
        .where(F.col("report_id").isNotNull() & (F.col("report_id") != ""))
        .withColumn("_rank", F.row_number().over(newest_first))
        .where("_rank = 1")
        .drop("_rank")
    )


def reports(latest: DataFrame) -> DataFrame:
    return latest.select(
        "report_id",
        # try_ variant: a bad date becomes null instead of failing the job (ANSI mode)
        F.try_to_timestamp("original_receive_date", F.lit("yyyyMMdd"))
        .cast("date")
        .alias("received_date"),
        F.coalesce(F.trim("animal.species"), F.lit("Unknown")).alias("species"),
        (F.col("serious_ae") == "true").alias("serious"),
        F.col("primary_reporter").alias("reporter"),
        # try_element_at: outcome can be an empty list, and [0] raises in ANSI mode
        F.try_element_at("outcome", F.lit(1))["medical_status"].alias("outcome"),
        "_source_file",
        "_ingested_at",
    )


def report_ingredients(latest: DataFrame) -> DataFrame:
    return (
        latest.select("report_id", F.explode("drug.active_ingredients").alias("ings"))
        .select("report_id", F.explode("ings.name").alias("raw_name"))
        .select("report_id", F.explode(ingredient_names(F.col("raw_name"))).alias("ingredient"))
        .distinct()
    )


def report_reactions(latest: DataFrame) -> DataFrame:
    return (
        latest.select("report_id", F.explode("reaction").alias("r"))
        .select("report_id", reaction_name(F.col("r.veddra_term_name")).alias("reaction"))
        .where(F.col("reaction") != "")
        .withColumn("category", reaction_category(F.col("reaction")))
        .distinct()
    )


def clinical(reactions: DataFrame) -> DataFrame:
    return reactions.where(F.col("category") == "clinical")
