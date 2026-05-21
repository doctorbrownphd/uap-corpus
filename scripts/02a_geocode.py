"""
02a_geocode.py

Geocodes the cleaned NUFORC reports by joining city+state against the
US Census Bureau Gazetteer files. No API calls, no rate limits — just a
local lookup table of ~68K US place names with official coordinates.

Falls back to state centroid for cities that don't match the gazetteer.

Run after 02_clean.py and before any analysis that needs coordinates.

Data source:
  US Census Bureau, 2024 Gazetteer Files
  https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
  - Places (cities, CDPs, towns): 2024_Gaz_place_national.txt
  - County subdivisions (townships): 2024_Gaz_cousubs_national.txt

Outputs:
  Updates data/interim/nuforc_clean.parquet in-place (adds lat/lon)
  data/interim/geocode_report.txt            match statistics
"""

import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CLEAN_PATH = ROOT / "data" / "interim" / "nuforc_clean.parquet"
GAZ_DIR = Path("/tmp/gaz")
PLACES_PATH = GAZ_DIR / "2024_Gaz_place_national.txt"
COUSUBS_PATH = GAZ_DIR / "2024_Gaz_cousubs_national.txt"
REPORT_PATH = ROOT / "data" / "interim" / "geocode_report.txt"

# State centroids (fallback for unmatched cities)
STATE_CENTROIDS = {
    "AL": (32.806671, -86.791130), "AK": (61.370716, -152.404419),
    "AZ": (33.729759, -111.431221), "AR": (34.969704, -92.373123),
    "CA": (36.116203, -119.681564), "CO": (39.059811, -105.311104),
    "CT": (41.597782, -72.755371), "DE": (39.318523, -75.507141),
    "FL": (27.766279, -81.686783), "GA": (33.040619, -83.643074),
    "HI": (21.094318, -157.498337), "ID": (44.240459, -114.478828),
    "IL": (40.349457, -88.986137), "IN": (39.849426, -86.258278),
    "IA": (42.011539, -93.210526), "KS": (38.526600, -96.726486),
    "KY": (37.668140, -84.670067), "LA": (31.169546, -91.867805),
    "ME": (44.693947, -69.381927), "MD": (39.063946, -76.802101),
    "MA": (42.230171, -71.530106), "MI": (43.326618, -84.536095),
    "MN": (45.694454, -93.900192), "MS": (32.741646, -89.678696),
    "MO": (38.456085, -92.288368), "MT": (46.921925, -110.454353),
    "NE": (41.125370, -98.268082), "NV": (38.313515, -117.055374),
    "NH": (43.452492, -71.563896), "NJ": (40.298904, -74.521011),
    "NM": (34.840515, -106.248482), "NY": (42.165726, -74.948051),
    "NC": (35.630066, -79.806419), "ND": (47.528912, -99.784012),
    "OH": (40.388783, -82.764915), "OK": (35.565342, -96.928917),
    "OR": (44.572021, -122.070938), "PA": (40.590752, -77.209755),
    "RI": (41.680893, -71.511780), "SC": (33.856892, -80.945007),
    "SD": (44.299782, -99.438828), "TN": (35.747845, -86.692345),
    "TX": (31.054487, -97.563461), "UT": (40.150032, -111.862434),
    "VT": (44.045876, -72.710686), "VA": (37.769337, -78.169968),
    "WA": (47.400902, -121.490494), "WV": (38.491226, -80.954456),
    "WI": (44.268543, -89.616508), "WY": (42.755966, -107.302490),
    "DC": (38.897438, -77.026817),
}


def load_gazetteer() -> pd.DataFrame:
    """Load and merge Census Gazetteer files into a single lookup table."""
    dfs = []

    for path in (PLACES_PATH, COUSUBS_PATH):
        if not path.exists():
            sys.exit(
                f"Gazetteer file not found: {path}\n"
                "Download with:\n"
                "  curl -sL https://www2.census.gov/geo/docs/maps-data/data/"
                "gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip "
                "-o /tmp/gaz_place.zip && unzip -o /tmp/gaz_place.zip -d /tmp/gaz/\n"
                "  curl -sL https://www2.census.gov/geo/docs/maps-data/data/"
                "gazetteer/2024_Gazetteer/2024_Gaz_cousubs_national.zip "
                "-o /tmp/gaz_cousubs.zip && unzip -o /tmp/gaz_cousubs.zip -d /tmp/gaz/"
            )
        df = pd.read_csv(path, sep="\t", low_memory=False, dtype=str)
        df.columns = df.columns.str.strip()
        df = df[["USPS", "NAME", "INTPTLAT", "INTPTLONG"]].copy()
        df["INTPTLAT"] = pd.to_numeric(df["INTPTLAT"], errors="coerce")
        df["INTPTLONG"] = pd.to_numeric(df["INTPTLONG"], errors="coerce")
        dfs.append(df)

    gaz = pd.concat(dfs, ignore_index=True)
    gaz = gaz.dropna(subset=["INTPTLAT", "INTPTLONG"])

    # Normalize the name for matching: strip suffixes like "city", "town",
    # "CDP", "village", "borough" that Census adds but NUFORC doesn't use
    gaz["name_clean"] = (
        gaz["NAME"]
        .str.lower()
        .str.replace(r"\s+(city|town|cdp|village|borough|township|plantation|municipality|charter township|metro township)$",
                      "", regex=True)
        .str.strip()
    )
    gaz["state"] = gaz["USPS"].str.strip()

    # Deduplicate: if same name+state appears multiple times, take the
    # "places" version (more likely to be the real city)
    gaz = gaz.drop_duplicates(subset=["name_clean", "state"], keep="first")

    print(f"  gazetteer: {len(gaz):,} unique name+state entries")
    return gaz


def normalize_city(city: str) -> str:
    """Normalize a NUFORC city name for matching against the gazetteer."""
    if pd.isna(city):
        return ""
    s = str(city).strip().lower()
    # Remove parenthetical notes like "(east of)" or "(near)"
    s = re.sub(r"\s*\([^)]*\)\s*", " ", s).strip()
    # Remove directional prefixes/suffixes
    s = re.sub(r"^(north|south|east|west|n\.|s\.|e\.|w\.)\s+", "", s)
    # Remove "St." -> "Saint" normalization
    s = re.sub(r"^st\.?\s+", "saint ", s)
    # Remove trailing state abbreviations if someone typed "City, ST"
    s = re.sub(r",\s*[A-Za-z]{2}$", "", s).strip()
    return s


def main():
    if not CLEAN_PATH.exists():
        sys.exit(f"Input not found: {CLEAN_PATH}\nRun 02_clean.py first.")

    print(f"Reading {CLEAN_PATH}...")
    df = pd.read_parquet(CLEAN_PATH)
    print(f"  {len(df):,} reports")

    print("Loading gazetteer...")
    gaz = load_gazetteer()

    # Build lookup dict: (name_clean, state) -> (lat, lon)
    gaz_lookup = {}
    for _, row in gaz.iterrows():
        key = (row["name_clean"], row["state"])
        gaz_lookup[key] = (row["INTPTLAT"], row["INTPTLONG"])

    # Normalize NUFORC city names
    df["city_clean"] = df["city"].apply(normalize_city)

    # --- Pass 1: Exact match on normalized name + state ---
    print("Geocoding pass 1: exact match...")
    lats, lons, methods = [], [], []
    matched = 0
    for _, row in df.iterrows():
        key = (row["city_clean"], row["state"])
        if key in gaz_lookup:
            lat, lon = gaz_lookup[key]
            lats.append(lat)
            lons.append(lon)
            methods.append("exact")
            matched += 1
        else:
            lats.append(None)
            lons.append(None)
            methods.append(None)

    df["latitude"] = lats
    df["longitude"] = lons
    df["geocode_method"] = methods
    print(f"  exact matches: {matched:,} ({matched/len(df)*100:.1f}%)")

    # --- Pass 2: Try without directional prefix on unmatched ---
    print("Geocoding pass 2: fuzzy city names...")
    unmatched_mask = df["latitude"].isna()
    pass2 = 0
    for idx in df[unmatched_mask].index:
        city = df.at[idx, "city_clean"]
        state = df.at[idx, "state"]

        # Try stripping more aggressively
        variants = [
            city,
            re.sub(r"^(north|south|east|west|new|old|upper|lower|mount|mt\.?|fort|ft\.?)\s+", "", city),
            re.sub(r"\s+(heights|hills|beach|springs|park|lake|landing|junction|center|centre)$", "", city),
        ]
        for v in variants:
            key = (v.strip(), state)
            if key in gaz_lookup:
                lat, lon = gaz_lookup[key]
                df.at[idx, "latitude"] = lat
                df.at[idx, "longitude"] = lon
                df.at[idx, "geocode_method"] = "fuzzy"
                pass2 += 1
                break

    print(f"  fuzzy matches: {pass2:,}")

    # --- Pass 3: State centroid fallback ---
    print("Geocoding pass 3: state centroid fallback...")
    still_unmatched = df["latitude"].isna()
    pass3 = 0
    for idx in df[still_unmatched].index:
        state = df.at[idx, "state"]
        if state in STATE_CENTROIDS:
            lat, lon = STATE_CENTROIDS[state]
            df.at[idx, "latitude"] = lat
            df.at[idx, "longitude"] = lon
            df.at[idx, "geocode_method"] = "state_centroid"
            pass3 += 1

    print(f"  state centroid fallback: {pass3:,}")

    # Summary
    total = len(df)
    exact = (df["geocode_method"] == "exact").sum()
    fuzzy = (df["geocode_method"] == "fuzzy").sum()
    centroid = (df["geocode_method"] == "state_centroid").sum()
    still_none = df["latitude"].isna().sum()

    print(f"\nGeocoding summary:")
    print(f"  Total reports:     {total:,}")
    print(f"  Exact match:       {exact:,} ({exact/total*100:.1f}%)")
    print(f"  Fuzzy match:       {fuzzy:,} ({fuzzy/total*100:.1f}%)")
    print(f"  State centroid:    {centroid:,} ({centroid/total*100:.1f}%)")
    print(f"  Still unmatched:   {still_none:,} ({still_none/total*100:.1f}%)")
    print(f"  City-level total:  {exact+fuzzy:,} ({(exact+fuzzy)/total*100:.1f}%)")

    # Drop the temp column and save
    df = df.drop(columns=["city_clean"])
    df.to_parquet(CLEAN_PATH, index=False)
    print(f"\nUpdated {CLEAN_PATH}")

    # Write report
    report = [
        "NUFORC corpus geocoding report",
        "=" * 50,
        f"Total reports:     {total:,}",
        f"Exact match:       {exact:,} ({exact/total*100:.1f}%)",
        f"Fuzzy match:       {fuzzy:,} ({fuzzy/total*100:.1f}%)",
        f"State centroid:    {centroid:,} ({centroid/total*100:.1f}%)",
        f"Still unmatched:   {still_none:,}",
        f"City-level rate:   {(exact+fuzzy)/total*100:.1f}%",
        "",
        "Top 20 unmatched cities:",
    ]
    if centroid + still_none > 0:
        unmatched_cities = (
            df[df["geocode_method"] == "state_centroid"]
            .groupby(["city", "state"]).size()
            .sort_values(ascending=False)
            .head(20)
        )
        for (city, state), count in unmatched_cities.items():
            report.append(f"  {city}, {state}: {count}")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(report) + "\n")
    print(f"Wrote {REPORT_PATH}")


if __name__ == "__main__":
    main()
