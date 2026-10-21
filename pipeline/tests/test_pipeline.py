"""Raw files through every stage, in the same order the Databricks job runs them."""

import json

from conftest import report
from vetsafety import bronze, export, gold, quality, silver


def test_end_to_end(spark, raw_dir, monkeypatch):
    seizure_drug = [
        report(f"S{i}", ingredients=("Drugamab Oxime 10Mg",), reactions=("Seizure NOS",))
        for i in range(12)
    ]
    background = [
        report(f"B{i}", date=f"2024{1 + i % 12:02d}01",
               ingredients=("Ivermectin, Pyrantel" if i % 2 else "Milbemycin Oxime",),
               reactions=("Seizure NOS",) if i < 3 else ("Vomiting",))
        for i in range(120)
    ]
    path = raw_dir({"2024q1.json": seizure_drug[:6] + background[:60],
                    "2024q2.json": seizure_drug[6:] + background[60:]})

    raw = bronze.read_raw(spark, path)
    latest = silver.latest_reports(raw)
    reports = silver.reports(latest)
    ingredients = silver.report_ingredients(latest)
    reactions = silver.report_reactions(latest)

    checks = quality.run_checks(raw, reports, ingredients, reactions)
    quality.raise_if_failed(checks)  # clean data passes

    monkeypatch.setattr(export, "MIN_INGREDIENT_REPORTS", 10)
    snapshot = export.build_snapshot(gold.signals(reports, ingredients, reactions), reports)
    json.dumps(snapshot)  # must be JSON-serialisable for the website

    assert snapshot["reports"] == 132
    flagged = {(s["ingredient"], s["reaction"]) for s in snapshot["signals"]}
    assert flagged == {("drugamab", "Seizure NOS")}
