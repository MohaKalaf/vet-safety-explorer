"""Name cleaning as Spark expressions. Same rules as src/lib/ingredients.ts.

Built from Spark's own functions rather than a Python UDF: no Python workers,
so nothing has to be importable on the executors, and it runs faster.
"""

from pyspark.sql import Column
from pyspark.sql import functions as F

SEPARATORS = r"(?i)\s*(?:[;,/+&]|\band\b)\s*"

NOT_A_DRUG = (
    r"(?i)\b(unknown|vaccines?|virus|leptospira|bordetella|recombinant|recombitek|coli|water|mab|lot)\b"
)

NOISE = [
    # dosage forms
    "chew", "chews", "chewable", "tablet", "tablets", "spot-on", "solution",
    "injection", "injectable", "inj", "vial", "granules", "powder", "susp",
    "suspension", "oint", "ointment", "ear", "for",
    # salts and other suffixes
    "as", "salt", "oxime", "maleate", "citrate", "hydrochloride", "dihydrochloride",
    "hcl", "pamoate", "sodium", "potassium", "phosphate", "tartrate", "trihydrate",
    "monohydrate", "proline", "acetate", "valerate", "furoate", "proxetil",
    "crystalline", "free", "acid", "sulfate", "pivalate", "tiglate",
    "polysulfate", "polysulfated",
]

# Reaction terms: VeDDRA versions add different "(see also ...)" notes
SEE_ALSO = r"(?i)\s*\(see also[^)]*\)"


def _clean_part(part: Column) -> Column:
    words = F.split(F.lower(F.regexp_replace(part, r"\([^)]*\)", " ")), r"\s+")
    words = F.filter(words, lambda w: ~w.rlike(r"\d"))  # doses, lot numbers, "12-week"
    words = F.transform(words, lambda w: F.regexp_replace(w, r"^[^a-z]+|[^a-z]+$", ""))
    # < 4 chars: "a", "kv", abbreviations like "pzq"
    words = F.filter(words, lambda w: (F.length(w) >= 4) & ~w.isin(*NOISE))
    return F.array_join(words, " ")


def ingredient_names(term: Column) -> Column:
    """array<string> of base ingredient names in an openFDA ingredient string."""
    term = F.coalesce(term, F.lit(""))
    names = F.array_distinct(
        F.filter(F.transform(F.split(term, SEPARATORS), _clean_part), lambda n: n != "")
    )
    return F.when(term.rlike(NOT_A_DRUG), F.array().cast("array<string>")).otherwise(names)


def reaction_name(term: Column) -> Column:
    return F.trim(F.regexp_replace(F.regexp_replace(term, SEE_ALSO, ""), r"\s+", " "))


# Not every VeDDRA term is a clinical sign. First match wins; anything else is
# "clinical". Signals use clinical terms only, as in standard pharmacovigilance.
REACTION_CATEGORIES = [
    ("lack_of_efficacy", r"(?i)^(partial )?lack of efficacy|^ineffective\b"),
    (
        "product_problem",
        r"(?i)applicator|administration device|device|"
        r"^(tubes?|vials?|bottles?|containers?|caps?|closure|seal|adaptor|dispenser|syringe|"
        r"insert|implant|capsules?|labels?|suspension|solution/suspension|precipitate)\b.*,|"
        r"^(underfilling|potency)\b|product (syringe|label|defect)|lot #|counterfeit|"
        r"packaging|locking mechanism|broken components",
    ),
    (
        "use_error",
        r"(?i)medication error|administration error|drug administ|incorrect (route|storage)|"
        r"wrong technique|labeled drug-species|off-label|overdose|intentional misuse|"
        r"difficult(y)? (of|to) use|instructions for use|compounding error|needlestick",
    ),
    (
        "administrative",
        r"(?i)^(unrelated death|no sign|uncoded sign|unclassifiable adverse event|residues in meat)",
    ),
]


def reaction_category(term: Column) -> Column:
    category = F.lit("clinical")
    for name, pattern in reversed(REACTION_CATEGORIES):
        category = F.when(term.rlike(pattern), name).otherwise(category)
    return category
