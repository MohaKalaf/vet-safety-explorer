"""Gold: monthly counts, disproportionality signals (PRR) and an ML feature table."""

from pyspark.sql import DataFrame, Window
from pyspark.sql import functions as F

# Evans et al. (2001), the usual screening thresholds for PRR
MIN_CASES = 3
MIN_PRR = 2.0
MIN_CHI2 = 4.0


def monthly_counts(reports: DataFrame, ingredients: DataFrame) -> DataFrame:
    return (
        reports.where("received_date IS NOT NULL")
        .join(ingredients, "report_id")
        .groupBy(
            F.trunc("received_date", "month").alias("month"), "species", "ingredient"
        )
        .agg(
            F.countDistinct("report_id").alias("reports"),
            F.sum(F.col("serious").cast("int")).alias("serious_reports"),
        )
    )


def signals(reports: DataFrame, ingredients: DataFrame, reactions: DataFrame) -> DataFrame:
    """PRR per (species, ingredient, reaction), stratified by species.

    2x2 table of reports, within one species:
                     reaction   other reactions
        ingredient       a             b
        other drugs      c             d
    PRR = (a / (a + b)) / (c / (c + d))
    """
    base = reports.select("report_id", "species")
    by_drug = base.join(ingredients, "report_id")
    by_reaction = base.join(reactions, "report_id")

    species_n = base.groupBy("species").agg(F.count("*").alias("n"))
    drug_n = by_drug.groupBy("species", "ingredient").agg(F.count("*").alias("drug_n"))
    reaction_n = by_reaction.groupBy("species", "reaction").agg(F.count("*").alias("reaction_n"))
    pairs = (
        by_drug.join(reactions, "report_id")
        .groupBy("species", "ingredient", "reaction")
        .agg(F.count("*").alias("a"))
        .where(F.col("a") >= MIN_CASES)
    )

    # doubles throughout: products like a*d overflow longs, and ANSI mode raises on overflow
    a = F.col("a").cast("double")
    b = (F.col("drug_n") - F.col("a")).cast("double")
    c = (F.col("reaction_n") - F.col("a")).cast("double")
    d = (F.col("n") - F.col("drug_n") - F.col("reaction_n") + F.col("a")).cast("double")
    n = F.col("n").cast("double")

    prr = (a / (a + b)) / (c / (c + d))
    se_log = F.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d))
    # Yates-corrected chi-square. try_divide: b + d is 0 when every report in a
    # species has this reaction, and ANSI mode raises on division by zero.
    chi2 = F.try_divide(
        n * F.pow(F.abs(a * d - b * c) - n / 2, 2), (a + b) * (c + d) * (a + c) * (b + d)
    )

    return (
        pairs.join(drug_n, ["species", "ingredient"])
        .join(reaction_n, ["species", "reaction"])
        .join(species_n, "species")
        # c = 0: the reaction never appears with any other drug, so PRR is undefined
        .where(F.col("reaction_n") > F.col("a"))
        .select(
            "species", "ingredient", "reaction", "a",
            F.col("drug_n").alias("ingredient_reports"),
            F.col("reaction_n").alias("reaction_reports"),
            F.col("n").alias("species_reports"),
            prr.alias("prr"),
            F.exp(F.log(prr) - 1.96 * se_log).alias("prr_ci_low"),
            F.exp(F.log(prr) + 1.96 * se_log).alias("prr_ci_high"),
            chi2.alias("chi2"),
        )
        .withColumn(
            "is_signal",
            (F.col("a") >= MIN_CASES)
            & (F.col("prr") >= MIN_PRR)
            & F.coalesce(F.col("chi2") >= MIN_CHI2, F.lit(False)),
        )
    )


def features(monthly: DataFrame) -> DataFrame:
    """Per ingredient, species and month: volume, serious share and 3-month trend."""
    month_index = F.year("month") * 12 + F.month("month")
    # range windows over a month number stay correct when some months have no reports
    per_series = Window.partitionBy("ingredient", "species").orderBy("month_index")
    last_3 = per_series.rangeBetween(-2, 0)
    prior_3 = per_series.rangeBetween(-5, -3)

    return (
        monthly.withColumn("month_index", month_index)
        .withColumn("serious_share", F.col("serious_reports") / F.col("reports"))
        .withColumn("reports_3m", F.sum("reports").over(last_3))
        .withColumn("reports_prior_3m", F.coalesce(F.sum("reports").over(prior_3), F.lit(0)))
        .withColumn(
            "reports_3m_change",
            F.when(
                F.col("reports_prior_3m") > 0,
                F.col("reports_3m") / F.col("reports_prior_3m") - 1,
            ),
        )
        .drop("month_index")
    )
