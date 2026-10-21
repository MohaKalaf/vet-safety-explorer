# "workspace" is the default catalog on Databricks Free Edition.
CATALOG = "workspace"
SCHEMA = "vetsafety"
RAW_DIR = f"/Volumes/{CATALOG}/{SCHEMA}/raw"
EXPORT_DIR = f"/Volumes/{CATALOG}/{SCHEMA}/exports"


def table(name: str) -> str:
    return f"{CATALOG}.{SCHEMA}.{name}"
