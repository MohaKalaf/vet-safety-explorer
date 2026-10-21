"""Bronze: raw reports exactly as openFDA sent them, one row per report."""

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import ArrayType, StringType, StructField, StructType


def _s(name: str) -> StructField:
    return StructField(name, StringType())


# Only the fields used downstream. An explicit schema means a renamed or
# missing field in a new file shows up as nulls (caught in silver) instead of
# silently changing the inferred types. openFDA sends every value as a string.
REPORT_SCHEMA = StructType([
    _s("unique_aer_id_number"),
    _s("original_receive_date"),
    _s("serious_ae"),
    _s("primary_reporter"),
    StructField("animal", StructType([
        _s("species"),
        _s("gender"),
        StructField("age", StructType([_s("min"), _s("unit")])),
    ])),
    StructField("drug", ArrayType(StructType([
        _s("brand_name"),
        _s("route"),
        StructField("active_ingredients", ArrayType(StructType([_s("name")]))),
    ]))),
    StructField("reaction", ArrayType(StructType([
        _s("veddra_term_name"),
        _s("veddra_version"),
    ]))),
    StructField("outcome", ArrayType(StructType([_s("medical_status")]))),
])

# Each file is one JSON object: {"meta": {...}, "results": [report, ...]}
FILE_SCHEMA = StructType([StructField("results", ArrayType(REPORT_SCHEMA))])


def read_raw(spark: SparkSession, path: str) -> DataFrame:
    files = (
        spark.read.schema(FILE_SCHEMA)
        .option("multiLine", "true")
        .json(path)
        .select("results", F.col("_metadata.file_name").alias("_source_file"))
    )
    return (
        files.select(F.explode("results").alias("report"), "_source_file")
        .select("report.*", "_source_file")
        .withColumn("_ingested_at", F.current_timestamp())
    )
