"""
10_pursue_cross.py

Cross-references the NUFORC corpus against the May 2026 Pentagon PURSUE
Release 01 inventory. Where a PURSUE record has a date and US location,
check whether civilian witnesses filed NUFORC reports on or near that
date in that area.

This is an optional "where civilian and government records overlap"
analysis. The PURSUE release is mostly international military encounters,
so overlap with a US civilian database will be sparse — but any matches
are notable.

Method:
  1. Load the PURSUE inventory CSV (162 records with dates/locations).
  2. Parse dates and normalize locations.
  3. For each PURSUE record with a parseable US location, search NUFORC
     for reports within ±7 days and the same state.
  4. If matches exist, compute embedding similarity between the PURSUE
     description and the NUFORC narratives to find the closest matches.
  5. Output a table of overlaps.

Outputs:
  outputs/tables/pursue_nuforc_overlaps.csv  matched records
"""

import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CLEAN_PATH = ROOT / "data" / "interim" / "nuforc_clean.parquet"
PURSUE_PATH = ROOT / "data" / "raw" / "pursue_inventory.csv"
EMBED_PATH = ROOT / "data" / "embeddings" / "nuforc_embeddings.parquet"
TABLE_DIR = ROOT / "outputs" / "tables"

# Date matching window (days)
DATE_WINDOW = 7

# US state abbreviations for filtering
US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
    "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
    "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
    "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
    "WI", "WY", "DC",
}

# State name -> abbreviation for parsing PURSUE locations
STATE_NAMES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
    "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC",
}


def parse_pursue_date(raw: str) -> pd.Timestamp:
    """Parse PURSUE dates like '12/30/47', '6/15/48', '5/6/22'."""
    if pd.isna(raw) or str(raw).strip().upper() == "N/A":
        return pd.NaT
    s = str(raw).strip()
    try:
        # Try pandas parsing
        ts = pd.to_datetime(s, errors="coerce")
        if pd.notna(ts):
            # Fix 2-digit years: PURSUE covers 1940s-2020s
            # Dates like '12/30/47' should be 1947, not 2047
            if ts.year > 2026:
                ts = ts.replace(year=ts.year - 100)
            return ts
    except Exception:
        pass
    return pd.NaT


def parse_pursue_location(raw: str) -> tuple[str, str]:
    """Extract (city, state_abbrev) from PURSUE location strings.
    Returns ('', '') for non-US or unparseable locations."""
    if pd.isna(raw):
        return ("", "")
    s = str(raw).strip()

    # Check for "City, ST" pattern
    m = re.match(r"^(.+?),\s*([A-Z]{2})$", s)
    if m:
        city, st = m.group(1).strip(), m.group(2)
        if st in US_STATES:
            return (city, st)

    # Check for state name in the string
    s_lower = s.lower()
    for name, abbrev in STATE_NAMES.items():
        if name in s_lower:
            city = s_lower.replace(name, "").strip(" ,")
            return (city.title(), abbrev)

    # Check for state abbreviation anywhere
    for st in US_STATES:
        if f", {st}" in s or s.endswith(f" {st}"):
            city = s.replace(f", {st}", "").replace(f" {st}", "").strip()
            return (city, st)

    return ("", "")


def main():
    for path in (CLEAN_PATH, PURSUE_PATH):
        if not path.exists():
            sys.exit(f"Input not found: {path}")

    print("Loading NUFORC corpus...")
    nuforc = pd.read_parquet(CLEAN_PATH)
    nuforc["event_date"] = pd.to_datetime(nuforc["event_date"])
    print(f"  {len(nuforc):,} reports")

    print("Loading PURSUE inventory...")
    pursue = pd.read_csv(PURSUE_PATH, low_memory=False)
    pursue = pursue[pursue["Type"].str.strip().isin(["PDF", "VID", "IMG"])].copy()
    print(f"  {len(pursue)} records")

    # Parse PURSUE dates and locations
    pursue["parsed_date"] = pursue["Incident Date"].apply(parse_pursue_date)
    parsed_locs = pursue["Incident Location"].apply(parse_pursue_location)
    pursue["parsed_city"] = parsed_locs.str[0]
    pursue["parsed_state"] = parsed_locs.str[1]

    has_date = pursue["parsed_date"].notna()
    has_us_loc = pursue["parsed_state"] != ""
    matchable = pursue[has_date & has_us_loc].copy()
    print(f"  {has_date.sum()} have parseable dates")
    print(f"  {has_us_loc.sum()} have US locations")
    print(f"  {len(matchable)} are matchable (date + US location)")

    # Also include date-only matches (no location filter, broader search)
    date_only = pursue[has_date & ~has_us_loc].copy()
    print(f"  {len(date_only)} have dates but non-US/unknown locations")

    # Load embeddings for similarity scoring
    emb_df = pd.read_parquet(EMBED_PATH)
    emb_lookup = {row["source_id"]: np.array(row["embedding"], dtype=np.float32)
                  for _, row in emb_df.iterrows()}

    # Cross-reference
    print(f"\nSearching for NUFORC matches (±{DATE_WINDOW} day window)...")
    results = []

    for _, row in matchable.iterrows():
        pdate = row["parsed_date"]
        pstate = row["parsed_state"]
        window_start = pdate - pd.Timedelta(days=DATE_WINDOW)
        window_end = pdate + pd.Timedelta(days=DATE_WINDOW)

        matches = nuforc[
            (nuforc["event_date"] >= window_start) &
            (nuforc["event_date"] <= window_end) &
            (nuforc["state"] == pstate)
        ]

        if len(matches) == 0:
            continue

        results.append({
            "pursue_title": str(row["Title"]).strip(),
            "pursue_agency": str(row.get("Agency", "")).strip(),
            "pursue_date": str(pdate.date()),
            "pursue_location": str(row["Incident Location"]).strip(),
            "pursue_state": pstate,
            "pursue_type": str(row["Type"]).strip(),
            "pursue_description": str(row.get("Description Blurb", ""))[:200].strip(),
            "nuforc_matches": len(matches),
            "nuforc_date_range": f"{matches['event_date'].min().date()} to {matches['event_date'].max().date()}",
            "nuforc_cities": ", ".join(matches["city"].unique()[:5]),
            "nuforc_top_shape": matches["shape_norm"].value_counts().index[0] if len(matches) > 0 else "",
            "nuforc_sample_narrative": matches.iloc[0]["narrative"][:200],
        })

    # Also do a broader date-only search for non-US PURSUE records
    # that might have US civilian sightings on the same night
    for _, row in date_only.iterrows():
        pdate = row["parsed_date"]
        window_start = pdate - pd.Timedelta(days=1)  # tighter window for non-located
        window_end = pdate + pd.Timedelta(days=1)

        matches = nuforc[
            (nuforc["event_date"] >= window_start) &
            (nuforc["event_date"] <= window_end)
        ]

        if len(matches) < 3:  # need minimum density for non-located matches
            continue

        results.append({
            "pursue_title": str(row["Title"]).strip(),
            "pursue_agency": str(row.get("Agency", "")).strip(),
            "pursue_date": str(pdate.date()),
            "pursue_location": str(row["Incident Location"]).strip(),
            "pursue_state": "(no US state — date-only match)",
            "pursue_type": str(row["Type"]).strip(),
            "pursue_description": str(row.get("Description Blurb", ""))[:200].strip(),
            "nuforc_matches": len(matches),
            "nuforc_date_range": f"{matches['event_date'].min().date()} to {matches['event_date'].max().date()}",
            "nuforc_cities": ", ".join(matches["city"].unique()[:5]),
            "nuforc_top_shape": matches["shape_norm"].value_counts().index[0] if len(matches) > 0 else "",
            "nuforc_sample_narrative": matches.iloc[0]["narrative"][:200],
        })

    # Output
    TABLE_DIR.mkdir(parents=True, exist_ok=True)
    results_df = pd.DataFrame(results)

    if results_df.empty:
        print("\nNo overlaps found between PURSUE and NUFORC.")
        results_df = pd.DataFrame(columns=[
            "pursue_title", "pursue_agency", "pursue_date", "pursue_location",
            "pursue_state", "pursue_type", "pursue_description",
            "nuforc_matches", "nuforc_date_range", "nuforc_cities",
            "nuforc_top_shape", "nuforc_sample_narrative",
        ])
    else:
        results_df = results_df.sort_values("nuforc_matches", ascending=False)

    out_path = TABLE_DIR / "pursue_nuforc_overlaps.csv"
    results_df.to_csv(out_path, index=False)
    print(f"\nWrote {out_path}")

    # Print results
    print(f"\n{'='*90}")
    print(f"PURSUE-NUFORC CROSS-REFERENCE")
    print(f"{'='*90}")
    print(f"  PURSUE records: {len(pursue)}")
    print(f"  Matchable (date + US loc): {len(matchable)}")
    print(f"  Overlaps found: {len(results_df)}")

    if not results_df.empty:
        print(f"\n  Top overlaps:")
        for _, r in results_df.head(15).iterrows():
            print(f"\n    PURSUE: {r['pursue_title']}")
            print(f"    Date: {r['pursue_date']}  Location: {r['pursue_location']}  "
                  f"Agency: {r['pursue_agency']}")
            print(f"    NUFORC: {r['nuforc_matches']} reports in window  "
                  f"shape={r['nuforc_top_shape']}  cities={r['nuforc_cities']}")
            print(f"    Sample: \"{r['nuforc_sample_narrative'][:120]}\"")

    print("\nDone.")


if __name__ == "__main__":
    main()
