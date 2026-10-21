import pytest

from vetsafety.names import ingredient_names, reaction_name

# Same cases as src/lib/ingredients.test.ts, so the two implementations stay in step.


def clean(spark, term):
    df = spark.createDataFrame([(term,)], "term string")
    return df.select(ingredient_names(df.term).alias("names")).first()["names"]


@pytest.mark.parametrize("term, expected", [
    ("Lotilaner", ["lotilaner"]),
    ("Milbemycin Oxime", ["milbemycin"]),
    ("Pyrantel As Pamoate Salt", ["pyrantel"]),
    ("Fluralaner 13.64% 12-Week Chew", ["fluralaner"]),
    ("Ivermectin/Pyrantel Pamoate Chewable 272Mcg/652Mg", ["ivermectin", "pyrantel"]),
    ("Lotilaner,Moxidectin,Praziquantel,Pyrantel Pamoate", ["lotilaner", "moxidectin", "praziquantel", "pyrantel"]),
    ("Amoxicillin Trihydrate;Clavulanate Potassium ( K-Clavulanate)", ["amoxicillin", "clavulanate"]),
    ("(S)-Methoprene", ["methoprene"]),
    ("Cyclosporine A", ["cyclosporine"]),
    ("Tigilanol Tiglate", ["tigilanol"]),
])
def test_cleans_ingredient_names(spark, term, expected):
    assert clean(spark, term) == expected


@pytest.mark.parametrize("term", [
    "Unknown",
    "Rabies Vaccine",
    "Rabies Virus, Kv",
    "Anti-Il31 Mab Mcs Lot #1283563",
    "Water, Sodium Chloride, Sodium Lactate, Potassium Chloride, Calcium Chloride",
    None,
    "",
])
def test_drops_non_drug_entries(spark, term):
    assert clean(spark, term) == []


def test_reaction_see_also_notes_are_dropped(spark):
    df = spark.createDataFrame(
        [("Lethargy (see also Central nervous system depression in 'Neurological')",)], "t string")
    assert df.select(reaction_name(df.t).alias("r")).first()["r"] == "Lethargy"
