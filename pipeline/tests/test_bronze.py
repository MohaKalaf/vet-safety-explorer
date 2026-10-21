from conftest import report
from vetsafety.bronze import read_raw


def test_one_row_per_report_with_source_file(spark, raw_dir):
    path = raw_dir({
        "2024q1.json": [report("A"), report("B")],
        "2024q2.json": [report("C")],
    })
    rows = {r["unique_aer_id_number"]: r for r in read_raw(spark, path).collect()}

    assert set(rows) == {"A", "B", "C"}
    assert rows["C"]["_source_file"] == "2024q2.json"
    assert rows["A"]["animal"]["species"] == "Dog"
    assert rows["A"]["drug"][0]["active_ingredients"][0]["name"] == "Lotilaner"
    assert rows["A"]["_ingested_at"] is not None


def test_ignores_fields_outside_the_schema(spark, raw_dir):
    df = read_raw(spark, raw_dir({"2024q1.json": [report("A")]}))
    assert "receiver" not in df.columns
