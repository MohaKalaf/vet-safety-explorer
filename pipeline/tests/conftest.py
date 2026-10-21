import json
import sys
from pathlib import Path

import pytest
from pyspark.sql import SparkSession

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture(scope="session")
def spark():
    session = (
        SparkSession.builder.master("local[1]")
        .appName("vetsafety-tests")
        .config("spark.ui.enabled", "false")
        .config("spark.sql.shuffle.partitions", "1")
        # match Databricks serverless defaults
        .config("spark.sql.ansi.enabled", "true")
        .config("spark.sql.session.timeZone", "UTC")
        .getOrCreate()
    )
    session.sparkContext.setLogLevel("ERROR")
    yield session
    session.stop()


def report(
    id,
    date="20240115",
    species="Dog",
    serious="false",
    ingredients=("Lotilaner",),
    reactions=("Vomiting",),
    outcomes=("Recovered/Normal",),
):
    """A report shaped like openFDA's, trimmed to the fields the pipeline reads."""
    return {
        "unique_aer_id_number": id,
        "original_receive_date": date,
        "serious_ae": serious,
        "primary_reporter": "Veterinarian",
        "animal": {"species": species, "gender": "Male", "age": {"min": "2.00", "unit": "Year"}},
        "drug": [{"brand_name": "X", "route": "Oral",
                  "active_ingredients": [{"name": n} for n in ingredients]}],
        "reaction": [{"veddra_term_name": r, "veddra_version": "11"} for r in reactions],
        "outcome": [{"medical_status": o} for o in outcomes],
        "receiver": {"organization": "ignored by the schema"},
    }


@pytest.fixture
def raw_dir(tmp_path):
    """Writes openFDA-style quarterly files: {"meta": ..., "results": [...]}."""

    def write(files: dict[str, list[dict]]) -> str:
        for name, reports in files.items():
            body = {"meta": {"last_updated": "2026-10-05"}, "results": reports}
            # openFDA files are pretty-printed across many lines
            (tmp_path / name).write_text(json.dumps(body, indent=2))
        return str(tmp_path)

    return write
