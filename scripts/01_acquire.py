"""
01_acquire.py

Acquires the raw NUFORC corpus and writes it to data/raw/nuforc.csv.

Two acquisition modes:

  1. CSV mode (historical mirrors)
     Pre-existing CSV from a public mirror:
       - Kaggle: NUFORC dataset (timothyrenner / planetsig variants)
       - HuggingFace: jason1966/NUFORC_ufo-sightings
       - data.world: timothyrenner/ufo-sightings

  2. JSONL mode (fresh scrape)
     Output from scripts/00_scrape.py (requires research permission).
     Combines the scraped detail records with the index metadata.

Drop the source file into data/raw/ and this script will normalize it.

Expected canonical schema after acquisition:
  - datetime         (string, original format preserved)
  - city             (string)
  - state            (string, 2-letter US or empty)
  - country          (string, 2-letter ISO or empty)
  - shape            (string)
  - duration_seconds (float, may be NaN)
  - duration_hours   (string, original free-text)
  - comments         (string, the witness narrative)
  - date_posted      (string)
  - latitude         (float)
  - longitude        (float)
  - source_id        (string, opaque row identifier)
  - tier1            (bool, NUFORC's "highlights" marker, JSONL mode only)
  - explanation      (string, NUFORC's grading, JSONL mode only)

Usage:
  # CSV mode (historical):
  python scripts/01_acquire.py --input data/raw/scrubbed.csv

  # JSONL mode (fresh scrape):
  python scripts/01_acquire.py --input data/raw/nuforc_reports.jsonl
"""

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_PATH = RAW_DIR / "nuforc.csv"
PROVENANCE_PATH = RAW_DIR / "PROVENANCE.md"

# Known schema variants. Maps source column -> canonical column.
KNOWN_SCHEMAS = {
    "scrubbed_v1": {
        # Most common form on Kaggle/HF mirrors
        "datetime": "datetime",
        "city": "city",
        "state": "state",
        "country": "country",
        "shape": "shape",
        "duration (seconds)": "duration_seconds",
        "duration (hours/min)": "duration_hours",
        "comments": "comments",
        "date posted": "date_posted",
        "latitude": "latitude",
        "longitude ": "longitude",  # trailing space is real in the source
    },
    "scrubbed_v2": {
        # Same data, occasionally re-published without the trailing space
        "datetime": "datetime",
        "city": "city",
        "state": "state",
        "country": "country",
        "shape": "shape",
        "duration (seconds)": "duration_seconds",
        "duration (hours/min)": "duration_hours",
        "comments": "comments",
        "date posted": "date_posted",
        "latitude": "latitude",
        "longitude": "longitude",
    },
    "renner_csv": {
        # timothyrenner's processed CSV uses different names
        "date_time": "datetime",
        "city": "city",
        "state": "state",
        "country": "country",
        "shape": "shape",
        "duration": "duration_hours",
        "text": "comments",
        "posted": "date_posted",
        "city_latitude": "latitude",
        "city_longitude": "longitude",
    },
    "kcimc_v1": {
        # kcimc/NUFORC on HuggingFace (Jan 2024 scrape, ~148K rows)
        # Location is a combined "City, ST, Country" field parsed below.
        "Sighting": "_sighting_id",
        "Occurred": "datetime",
        "Shape": "shape",
        "Duration": "duration_hours",
        "Text": "comments",
        "Posted": "date_posted",
        "Summary": "_summary",
        "Characteristics": "_characteristics",
        "Explanation": "explanation",
    },
}


def detect_schema(df: pd.DataFrame) -> str:
    """Return the name of the schema that best matches df's columns."""
    cols = set(df.columns)
    best, best_overlap = None, 0
    for name, mapping in KNOWN_SCHEMAS.items():
        overlap = len(cols & set(mapping.keys()))
        if overlap > best_overlap:
            best, best_overlap = name, overlap
    if best is None or best_overlap < 4:
        raise ValueError(
            f"Could not identify schema. Got columns: {sorted(cols)}\n"
            f"Known schemas check first columns of each:\n"
            + "\n".join(f"  {n}: {list(m.keys())[:5]}" for n, m in KNOWN_SCHEMAS.items())
        )
    return best


def make_source_id(row) -> str:
    """Stable hash of a row's identifying fields for dedup across acquisitions."""
    key = f"{row['datetime']}|{row['city']}|{row['state']}|{str(row['comments'])[:200]}"
    return hashlib.sha1(key.encode("utf-8", errors="ignore")).hexdigest()[:16]


def parse_kcimc_location(loc: str) -> tuple[str, str, str]:
    """Split 'City, ST, Country' into (city, state, country).
    Handles variations like 'City, ST' or just 'City'."""
    if pd.isna(loc) or not str(loc).strip():
        return ("", "", "")
    parts = [p.strip() for p in str(loc).split(",")]
    if len(parts) >= 3:
        return (parts[0], parts[1], parts[2])
    if len(parts) == 2:
        return (parts[0], parts[1], "")
    return (parts[0], "", "")


def normalize(df: pd.DataFrame, schema_name: str) -> pd.DataFrame:
    """Rename source columns to canonical names, add source_id."""
    mapping = KNOWN_SCHEMAS[schema_name]
    rename = {k: v for k, v in mapping.items() if k in df.columns}
    df = df.rename(columns=rename)

    # kcimc_v1: split the combined Location column into city/state/country
    if schema_name == "kcimc_v1" and "Location" in df.columns:
        parsed = df["Location"].apply(parse_kcimc_location)
        df["city"] = parsed.str[0]
        df["state"] = parsed.str[1]
        df["country"] = parsed.str[2]

    # Ensure all canonical columns exist (fill missing with NaN/None)
    canonical = [
        "datetime", "city", "state", "country", "shape",
        "duration_seconds", "duration_hours", "comments",
        "date_posted", "latitude", "longitude",
    ]
    for col in canonical:
        if col not in df.columns:
            df[col] = pd.NA

    # Preserve kcimc extras (explanation, summary, characteristics)
    extras = []
    for extra in ("explanation", "_summary", "_characteristics"):
        if extra in df.columns:
            extras.append(extra)

    df["source_id"] = df.apply(make_source_id, axis=1)
    return df[canonical + extras + ["source_id"]]


def write_provenance(source_path: Path, schema_name: str, row_count: int) -> None:
    stat = source_path.stat()
    sha = hashlib.sha256()
    with open(source_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)

    entry = (
        f"## Acquisition: {pd.Timestamp.utcnow().isoformat()}\n\n"
        f"- Source file: `{source_path.name}`\n"
        f"- Schema detected: `{schema_name}`\n"
        f"- File size: {stat.st_size:,} bytes\n"
        f"- SHA-256: `{sha.hexdigest()}`\n"
        f"- Rows acquired: {row_count:,}\n"
        f"- Output: `{OUT_PATH.relative_to(ROOT)}`\n\n"
    )

    if PROVENANCE_PATH.exists():
        existing = PROVENANCE_PATH.read_text()
    else:
        existing = (
            "# Data Provenance\n\n"
            "This file documents every acquisition of raw data into this "
            "project. Each entry records what file was ingested, its hash, "
            "and which schema variant it matched. The underlying data is "
            "not redistributed with this repository.\n\n"
        )

    PROVENANCE_PATH.write_text(existing + entry)


def load_jsonl_scrape(jsonl_path: Path, index_path: Path | None = None) -> pd.DataFrame:
    """
    Load reports.jsonl from the scraper and join with nuforc_index.csv for
    metadata that isn't on the detail pages (state, country, summary).

    Output dataframe has the same canonical columns as the CSV path,
    plus tier1 and explanation columns.
    """
    print(f"Reading scraped reports from {jsonl_path}...")
    rows = []
    with open(jsonl_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"  WARNING: skipping malformed line: {e}")
    detail_df = pd.DataFrame(rows)
    print(f"  loaded {len(detail_df):,} detail records")

    # Default index path: same directory as JSONL, named nuforc_index.csv
    if index_path is None:
        index_path = jsonl_path.parent / "nuforc_index.csv"

    if not index_path.exists():
        sys.exit(
            f"Index not found: {index_path}\n"
            f"The JSONL scrape needs the index CSV for state/country/summary.\n"
            f"Run 00_scrape.py first to produce both files together."
        )

    print(f"Joining with index from {index_path}...")
    index_df = pd.read_csv(index_path, low_memory=False)
    # Sighting IDs are integers in both; coerce to be sure
    detail_df["sighting_id"] = pd.to_numeric(detail_df["sighting_id"], errors="coerce").astype("Int64")
    index_df["sighting_id"] = pd.to_numeric(index_df["sighting_id"], errors="coerce").astype("Int64")

    merged = detail_df.merge(index_df, on="sighting_id", how="left",
                             suffixes=("_detail", "_index"))
    print(f"  joined: {len(merged):,} rows")

    # Build the canonical dataframe. Prefer detail-page values where they
    # exist (more accurate), fall back to index values.
    def coalesce(col_detail: str, col_index: str) -> pd.Series:
        if col_detail in merged.columns and col_index in merged.columns:
            return merged[col_detail].fillna(merged[col_index]).astype(str)
        return merged.get(col_detail, merged.get(col_index, pd.Series([""] * len(merged))))

    out = pd.DataFrame({
        "datetime":         coalesce("occurred_detail", "occurred_index"),
        "city":             merged.get("city", pd.Series([""] * len(merged))).fillna("").astype(str),
        "state":            merged.get("state", pd.Series([""] * len(merged))).fillna("").astype(str),
        "country":          merged.get("country", pd.Series([""] * len(merged))).fillna("").astype(str),
        "shape":            coalesce("shape_detail", "shape_index"),
        "duration_seconds": pd.NA,  # not parsed from free-text yet; 02_clean.py handles
        "duration_hours":   merged.get("duration", pd.Series([""] * len(merged))).fillna("").astype(str),
        "comments":         merged.get("narrative", pd.Series([""] * len(merged))).fillna("").astype(str),
        "date_posted":      coalesce("posted", "reported"),
        "latitude":         pd.NA,  # not on detail page; geocoding is a later stage
        "longitude":        pd.NA,
        "tier1":            merged.get("is_tier1", pd.Series([False] * len(merged))).fillna(False).astype(bool),
        "explanation":      merged.get("explanation", pd.Series([""] * len(merged))).fillna("").astype(str),
    })

    out["source_id"] = out.apply(make_source_id, axis=1)

    canonical = [
        "datetime", "city", "state", "country", "shape",
        "duration_seconds", "duration_hours", "comments",
        "date_posted", "latitude", "longitude",
        "tier1", "explanation", "source_id",
    ]
    return out[canonical]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Path to source CSV or JSONL "
             "(e.g. data/raw/scrubbed.csv or data/raw/nuforc_reports.jsonl)",
    )
    parser.add_argument(
        "--index",
        type=Path,
        default=None,
        help="JSONL mode only: path to nuforc_index.csv "
             "(default: same dir as --input)",
    )
    args = parser.parse_args()

    if not args.input.exists():
        sys.exit(f"Source file not found: {args.input}")

    # Route on file extension
    if args.input.suffix.lower() == ".jsonl":
        normalized = load_jsonl_scrape(args.input, args.index)
        schema_name = "scraped_jsonl_v1"
        print(f"  normalized to {len(normalized.columns)} canonical columns")
    else:
        print(f"Reading {args.input}...")
        try:
            df = pd.read_csv(args.input, low_memory=False)
        except UnicodeDecodeError:
            print("UTF-8 failed, retrying with latin-1...")
            df = pd.read_csv(args.input, low_memory=False, encoding="latin-1")
        print(f"  loaded {len(df):,} rows, columns: {list(df.columns)}")

        schema_name = detect_schema(df)
        print(f"  detected schema: {schema_name}")
        normalized = normalize(df, schema_name)
        print(f"  normalized to {len(normalized.columns)} canonical columns")

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    normalized.to_csv(OUT_PATH, index=False)
    print(f"Wrote {OUT_PATH} ({len(normalized):,} rows)")

    write_provenance(args.input, schema_name, len(normalized))
    print(f"Updated {PROVENANCE_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
