"""
02_clean.py

Reads data/raw/nuforc.csv, applies cleaning and normalization, and writes
data/interim/nuforc_clean.parquet. Also writes a drop log to
data/interim/drops.csv so every excluded row is justified.

Decisions documented:
  - Two-digit years in NUFORC's source: 00-29 -> 20XX, 30-99 -> 19XX. This
    is the standard pivot used by previous published analyses.
  - US-only filter applied for the v0 analysis: cleaner geocoding, larger
    coherent sample, single-language narratives. International is a v2.
  - Narratives shorter than 30 characters are dropped (mostly "saw a
    light" with no substance to analyze).
  - HTML entities in comments are decoded.
  - All-caps narratives are preserved as-is (early reports were sometimes
    typed in caps; this is a feature of the corpus, not a bug).

Outputs:
  - data/interim/nuforc_clean.parquet  -- cleaned dataframe
  - data/interim/drops.csv             -- one row per excluded record
  - data/interim/cleaning_report.txt   -- human-readable summary
"""

import html
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
IN_PATH = ROOT / "data" / "raw" / "nuforc.csv"
OUT_PATH = ROOT / "data" / "interim" / "nuforc_clean.parquet"
DROPS_PATH = ROOT / "data" / "interim" / "drops.csv"
REPORT_PATH = ROOT / "data" / "interim" / "cleaning_report.txt"

MIN_NARRATIVE_CHARS = 30
US_ONLY = True


def parse_nuforc_datetime(raw: str) -> pd.Timestamp:
    """
    NUFORC dates come in formats like '10/10/1949 20:30' or '10/10/49 20:30'.
    Returns NaT for unparseable values.

    Two-digit year handling: pandas defaults to a different pivot than we
    want, so we coerce explicitly. NUFORC reports filed since the 1990s
    sometimes describe events from before 1930, so we use a 30/70 pivot:
    00-29 -> 20xx, 30-99 -> 19xx.
    """
    if pd.isna(raw):
        return pd.NaT
    s = str(raw).strip()
    if not s:
        return pd.NaT

    # Strip trailing timezone labels from kcimc-format dates
    # e.g. "2014-09-21 13:00:00 Local" or "2014-10-23 11:11:17 Pacific"
    s = re.sub(r"\s+(Local|Pacific|Eastern|Central|Mountain|UTC)$", "", s)

    # Match short year form first
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2})\s+(\d{1,2}):(\d{2})$", s)
    if m:
        mo, dy, yr, hr, mn = m.groups()
        yr_int = int(yr)
        full_year = 2000 + yr_int if yr_int <= 29 else 1900 + yr_int
        try:
            return pd.Timestamp(
                year=full_year, month=int(mo), day=int(dy),
                hour=int(hr) % 24, minute=int(mn),
            )
        except (ValueError, OverflowError):
            return pd.NaT

    # Four-digit year form
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2})$", s)
    if m:
        mo, dy, yr, hr, mn = m.groups()
        try:
            return pd.Timestamp(
                year=int(yr), month=int(mo), day=int(dy),
                hour=int(hr) % 24, minute=int(mn),
            )
        except (ValueError, OverflowError):
            return pd.NaT

    # Last resort: let pandas try
    try:
        return pd.to_datetime(s, errors="coerce")
    except Exception:
        return pd.NaT


def strip_pd_boilerplate(s: str) -> str:
    """Remove Peter Davenport (PD) editorial annotations that contaminate
    narrative embeddings and downstream analysis. These are appended to
    many reports and are not witness language."""
    # Full PD signature sentences
    pd_patterns = [
        r"Witness elects to remain totally anonymous[;,.]?\s*provides?\s*(no|little)\s*contact information\.?\s*PD\.?",
        r"Witness elects to remain totally anonymous\.?\s*PD\.?",
        r"Witness indicates that the date of the (?:sighting|incident|event) is approximate\.?\s*PD\.?",
        r"Source of (?:the )?report (?:indicates that the date is approximate|elects to remain anonymous)[^.]*\.?\s*PD\.?",
        r"We suspect that the (?:sighting|object) (?:was|may have been) a [^.]+\.?\s*PD\.?",
        r"We spoke (?:at length )?with this witness via telephone[^.]*\.?\s*PD\.?",
        r"(?:Possibly not a serious report|Possible hoax)[^.]*\.?\s*PD\.?",
        r"We have amended the time above[^.]*\.?\s*PD\.?",
        r"NUFORC Note:[^\n]*",
    ]
    for pat in pd_patterns:
        s = re.sub(pat, "", s, flags=re.IGNORECASE)
    # Trailing standalone "PD" or "PD." at end of text
    s = re.sub(r"\s+PD\.?\s*$", "", s)
    return s.strip()


def clean_narrative(raw: str) -> str:
    """Decode HTML entities, strip PD boilerplate, collapse whitespace."""
    if pd.isna(raw):
        return ""
    s = html.unescape(str(raw))
    # NUFORC's archive uses &#44; etc liberally; double-unescape catches
    # cases where entities were entity-encoded
    s = html.unescape(s)
    # Collapse all whitespace runs to single spaces, but preserve
    # paragraph breaks via a placeholder
    s = re.sub(r"\r\n|\r|\n+", " || ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace(" || ", "\n\n")
    # Strip PD editorial annotations
    s = strip_pd_boilerplate(s)
    return s


def clean_shape(raw: str) -> str:
    if pd.isna(raw):
        return ""
    s = str(raw).strip().lower()
    # Common NUFORC variants to merge
    aliases = {
        "changed": "changing",
        "round": "sphere",
        "disk": "disc",
        "fireball": "fireball",
        "flash": "flash",
        "light": "light",
        "triangle": "triangle",
        "circle": "circle",
    }
    return aliases.get(s, s)


def main():
    if not IN_PATH.exists():
        sys.exit(
            f"Input not found: {IN_PATH}\n"
            "Run 01_acquire.py first."
        )

    print(f"Reading {IN_PATH}...")
    df = pd.read_csv(IN_PATH, low_memory=False)
    n_start = len(df)
    print(f"  {n_start:,} rows to clean")

    drops = []  # list of (source_id, reason) tuples

    # Parse datetimes
    print("Parsing datetimes...")
    df["event_dt"] = df["datetime"].apply(parse_nuforc_datetime)
    bad_dt = df["event_dt"].isna()
    for sid in df.loc[bad_dt, "source_id"]:
        drops.append((sid, "unparseable_datetime"))
    df = df.loc[~bad_dt].copy()
    print(f"  dropped {bad_dt.sum():,} for unparseable datetime")

    # Coerce numeric columns
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df["duration_seconds"] = pd.to_numeric(df["duration_seconds"], errors="coerce")

    # Clean narrative
    print("Cleaning narratives...")
    df["narrative"] = df["comments"].apply(clean_narrative)
    df["narrative_chars"] = df["narrative"].str.len()

    short = df["narrative_chars"] < MIN_NARRATIVE_CHARS
    for sid in df.loc[short, "source_id"]:
        drops.append((sid, "narrative_too_short"))
    df = df.loc[~short].copy()
    print(f"  dropped {short.sum():,} for narrative under {MIN_NARRATIVE_CHARS} chars")

    # Normalize shape
    df["shape_norm"] = df["shape"].apply(clean_shape)

    # Normalize state
    df["state"] = df["state"].astype(str).str.strip().str.upper().replace("NAN", "")
    df["country"] = df["country"].astype(str).str.strip().str.lower().replace("nan", "")

    # US-only filter
    if US_ONLY:
        # NUFORC reports use "us" or empty country for US; treat empty
        # country with a valid US state code as US
        us_states = {
            "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID",
            "IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS",
            "MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
            "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
            "WI","WY","DC",
        }
        is_us = (df["country"] == "us") | df["state"].isin(us_states)
        for sid in df.loc[~is_us, "source_id"]:
            drops.append((sid, "non_us"))
        n_before = len(df)
        df = df.loc[is_us].copy()
        print(f"  dropped {n_before - len(df):,} non-US records")

    # Require valid coordinates for clustering work later, unless the
    # corpus has no coordinates at all (scraped mode before geocoding).
    if df["latitude"].notna().any():
        bad_coords = df["latitude"].isna() | df["longitude"].isna()
        bad_coords |= (df["latitude"].abs() > 90) | (df["longitude"].abs() > 180)
        for sid in df.loc[bad_coords, "source_id"]:
            drops.append((sid, "invalid_coordinates"))
        df = df.loc[~bad_coords].copy()
        print(f"  dropped {bad_coords.sum():,} for invalid coordinates")
    else:
        print(f"  no coordinates present; skipping coord filter "
              f"(run a geocoding stage before clustering)")

    # Add derived time columns for later analysis
    df["event_year"] = df["event_dt"].dt.year
    df["event_decade"] = (df["event_year"] // 10) * 10
    df["event_date"] = df["event_dt"].dt.date

    # Sanity bound on years
    sane_years = (df["event_year"] >= 1900) & (df["event_year"] <= 2026)
    for sid in df.loc[~sane_years, "source_id"]:
        drops.append((sid, "year_out_of_range"))
    df = df.loc[sane_years].copy()
    print(f"  dropped {(~sane_years).sum():,} for year out of [1900, 2026]")

    # Final columns to persist
    keep = [
        "source_id", "event_dt", "event_year", "event_decade", "event_date",
        "city", "state", "country", "latitude", "longitude",
        "shape", "shape_norm", "duration_seconds", "duration_hours",
        "narrative", "narrative_chars", "date_posted",
    ]
    # Preserve NUFORC quality metadata if it's there (scraped mode only)
    for optional in ("tier1", "explanation"):
        if optional in df.columns:
            keep.append(optional)
    df = df[keep].reset_index(drop=True)

    # Write outputs
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PATH, index=False)
    print(f"\nWrote {OUT_PATH} ({len(df):,} rows)")

    drops_df = pd.DataFrame(drops, columns=["source_id", "reason"])
    drops_df.to_csv(DROPS_PATH, index=False)
    print(f"Wrote {DROPS_PATH} ({len(drops_df):,} drops)")

    # Human-readable report
    drop_summary = drops_df["reason"].value_counts().to_dict()
    if len(df) == 0:
        sys.exit("ERROR: all rows were dropped during cleaning. Check input data format.")
    yr_min, yr_max = int(df["event_year"].min()), int(df["event_year"].max())
    decades = df["event_decade"].value_counts().sort_index()

    report = [
        "NUFORC corpus cleaning report",
        "=" * 50,
        f"Input rows:  {n_start:,}",
        f"Output rows: {len(df):,}",
        f"Retention:   {len(df)/n_start*100:.1f}%",
        "",
        "Drops by reason:",
    ]
    for reason, count in sorted(drop_summary.items(), key=lambda x: -x[1]):
        report.append(f"  {reason:30s} {count:>8,}")
    report.extend([
        "",
        f"Year range: {yr_min} - {yr_max}",
        "",
        "Reports per decade:",
    ])
    for decade, count in decades.items():
        report.append(f"  {int(decade)}s   {count:>8,}")

    REPORT_PATH.write_text("\n".join(report) + "\n")
    print(f"Wrote {REPORT_PATH}")
    print()
    print("\n".join(report))


if __name__ == "__main__":
    main()
