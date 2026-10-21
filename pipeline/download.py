"""Download openFDA animal adverse event files, one JSON file per quarter.

    python pipeline/download.py --since 2023q1 --out pipeline/raw

Standard library only, so it runs anywhere (your laptop or Databricks).
"""

import argparse
import io
import json
import re
import urllib.request
import zipfile
from pathlib import Path

INDEX_URL = "https://api.fda.gov/download.json"
QUARTER = re.compile(r"/event/(\d{4}q[1-4])/")


def quarter_files(index: dict, since: str) -> list[tuple[str, str]]:
    """(quarter, url) pairs from openFDA's download index, oldest first."""
    partitions = index["results"]["animalandveterinary"]["event"]["partitions"]
    files = []
    for part in partitions:
        match = QUARTER.search(part["file"])
        # "all_other" holds undated reports; skipped since it has no quarter
        if match and match.group(1) >= since:
            files.append((match.group(1), part["file"]))
    return sorted(files)


def download(since: str, out: Path) -> list[Path]:
    out.mkdir(parents=True, exist_ok=True)
    # timeout: a blocked network should fail fast, not hang the job
    with urllib.request.urlopen(INDEX_URL, timeout=60) as res:
        index = json.load(res)

    saved = []
    for quarter, url in quarter_files(index, since):
        target = out / f"{quarter}.json"
        with urllib.request.urlopen(url, timeout=300) as res:
            with zipfile.ZipFile(io.BytesIO(res.read())) as archive:
                target.write_bytes(archive.read(archive.namelist()[0]))
        print(f"{quarter}: {target.stat().st_size / 1e6:.1f} MB")
        saved.append(target)
    return saved


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", default="2023q1", help="first quarter, e.g. 2023q1")
    parser.add_argument("--out", type=Path, default=Path("pipeline/raw"))
    args = parser.parse_args()
    download(args.since.lower(), args.out)
