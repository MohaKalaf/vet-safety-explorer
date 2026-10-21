import pytest

from conftest import report
from vetsafety.bronze import read_raw
from vetsafety.quality import raise_if_failed, run_checks
from vetsafety.silver import latest_reports, report_ingredients, report_reactions, reports

LETHARGY_V1 = "Lethargy (see also Central nervous system depression in Neurological)"
LETHARGY_V2 = "Lethargy (see also Central nervous system depression in 'Neurological')"


@pytest.fixture
def latest(spark, raw_dir):
    path = raw_dir({
        "2024q1.json": [
            report("A", serious="true", reactions=(LETHARGY_V1, "Vomiting")),
            report("B", date="20240230", species=None),  # 30 Feb, no species
            report("DUP", reactions=("Old reaction",)),
            report("", ingredients=("Ivermectin",)),  # no id: dropped
        ],
        "2024q2.json": [
            report("DUP", reactions=("New reaction",)),
            report("C", ingredients=("Ivermectin/Pyrantel Pamoate Chewable 68Mcg/163Mg", "Unknown"),
                   reactions=(LETHARGY_V2,), outcomes=()),  # empty outcome list
        ],
    })
    bronze = read_raw(spark, path)
    return bronze, latest_reports(bronze)


def test_latest_reports_dedupes_and_drops_missing_ids(latest):
    _, df = latest
    ids = sorted(r["report_id"] for r in df.collect())
    assert ids == ["A", "B", "C", "DUP"]


def test_newest_file_wins_for_duplicates(latest):
    _, df = latest
    reactions = {r["reaction"] for r in report_reactions(df).where("report_id = 'DUP'").collect()}
    assert reactions == {"New reaction"}


def test_reports_are_typed(latest):
    _, df = latest
    rows = {r["report_id"]: r for r in reports(df).collect()}
    assert str(rows["A"]["received_date"]) == "2024-01-15"
    assert rows["A"]["serious"] is True
    assert rows["B"]["received_date"] is None  # invalid date tolerated, not a crash
    assert rows["B"]["species"] == "Unknown"
    assert rows["C"]["serious"] is False
    assert rows["C"]["outcome"] is None  # empty list, no crash in ANSI mode


def test_ingredients_are_cleaned_and_split(latest):
    _, df = latest
    rows = {(r["report_id"], r["ingredient"]) for r in report_ingredients(df).collect()}
    assert ("C", "ivermectin") in rows
    assert ("C", "pyrantel") in rows
    assert not any(ing == "unknown" for _, ing in rows)


def test_reaction_versions_merge(latest):
    _, df = latest
    rows = {(r["report_id"], r["reaction"]) for r in report_reactions(df).collect()}
    assert ("A", "Lethargy") in rows
    assert ("C", "Lethargy") in rows


def test_quality_checks_count_problems(latest):
    bronze, df = latest
    checks = {c.name: c for c in run_checks(
        bronze, reports(df), report_ingredients(df), report_reactions(df))}
    assert checks["missing report id"].failed == 1
    assert checks["duplicate report ids"].failed == 1
    assert checks["unparseable receive date"].failed == 1
    # 1 bad date in 4 reports is far over the 1% limit
    with pytest.raises(ValueError, match="unparseable receive date"):
        raise_if_failed(list(checks.values()))
