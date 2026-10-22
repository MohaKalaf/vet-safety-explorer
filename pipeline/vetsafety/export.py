"""Snapshot of flagged signals for the website (src/data/signals.json)."""

from datetime import date

from pyspark.sql import DataFrame
from pyspark.sql import functions as F

# Below this, a drug's PRR is too noisy to be worth showing
MIN_INGREDIENT_REPORTS = 50
# No animal named: almost all product complaints rather than reactions
EXCLUDED_SPECIES = ["Unknown"]
MAX_PER_SPECIES = 100


def build_snapshot(signals: DataFrame, reports: DataFrame) -> dict:
    window = reports.agg(
        F.min("received_date").alias("first"),
        F.max("received_date").alias("last"),
        F.count("*").alias("reports"),
    ).first()

    flagged = (
        signals.where("is_signal")
        .where(F.col("ingredient_reports") >= MIN_INGREDIENT_REPORTS)
        .where(~F.col("species").isin(*EXCLUDED_SPECIES))
        .orderBy("species", F.desc("prr_ci_low"))
        .collect()
    )

    rows, per_species = [], {}
    for r in flagged:
        per_species[r["species"]] = per_species.get(r["species"], 0) + 1
        if per_species[r["species"]] > MAX_PER_SPECIES:
            continue
        rows.append({
            "species": r["species"],
            "ingredient": r["ingredient"],
            "reaction": r["reaction"],
            "cases": r["a"],
            "ingredientReports": r["ingredient_reports"],
            "prr": round(r["prr"], 2),
            "ciLow": round(r["prr_ci_low"], 2),
            "ciHigh": round(r["prr_ci_high"], 2),
            "chi2": round(r["chi2"], 1),
        })

    return {
        "generated": date.today().isoformat(),
        "dataFrom": window["first"].isoformat() if window["first"] else None,
        "dataTo": window["last"].isoformat() if window["last"] else None,
        "reports": window["reports"],
        "signals": rows,
    }
