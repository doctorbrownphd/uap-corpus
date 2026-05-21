"""
common.py

Shared constants, lookups, and utility functions used across pipeline scripts.
Consolidates duplicated definitions so each lives in exactly one place.
"""

from pathlib import Path

import numpy as np

# ---------------------------------------------------------------------------
# Project paths
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
CLEAN_PATH = ROOT / "data" / "interim" / "nuforc_clean.parquet"
EMBED_PATH = ROOT / "data" / "embeddings" / "nuforc_embeddings.parquet"
DERIVED_DIR = ROOT / "data" / "derived"
CHART_DIR = ROOT / "outputs" / "charts"
TABLE_DIR = ROOT / "outputs" / "tables"

# ---------------------------------------------------------------------------
# US geography
# ---------------------------------------------------------------------------

US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
    "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
    "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
    "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
    "WI", "WY", "DC",
}

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

# ---------------------------------------------------------------------------
# Known events (unified schema for scripts 08 and 09)
#
# Fields used by both scripts:
#   name, start (alias date_range[0]), end (alias date_range[1]), states
# Fields used only by 09_validate:
#   date, expected_shape, expected_phrases, type
# Fields used only by 08_signatures:
#   (no extra fields beyond the common ones)
# ---------------------------------------------------------------------------

KNOWN_EVENTS = [
    {
        "name": "Phoenix Lights (1997)",
        "date": "1997-03-13",
        "start": "1997-03-10",
        "end": "1997-03-20",
        "date_range": ("1997-03-10", "1997-03-20"),
        "states": ["AZ", "NV"],
        "expected_shape": "triangle",
        "expected_phrases": ["phoenix lights", "white lights", "air force"],
        "type": "unexplained",
    },
    {
        "name": "Illinois Triangle (2000)",
        "start": "2000-01-04",
        "end": "2000-01-08",
        "date_range": ("2000-01-04", "2000-01-08"),
        "states": ["IL"],
        "expected_shape": None,
        "expected_phrases": [],
        "type": "unexplained",
    },
    {
        "name": "Tinley Park IL (2004)",
        "date": "2004-10-31",
        "start": "2004-10-25",
        "end": "2004-11-07",
        "date_range": ("2004-10-25", "2004-11-07"),
        "states": ["IL"],
        "expected_shape": "light",
        "expected_phrases": ["red lights", "tinley park", "triangle formation"],
        "type": "unexplained",
    },
    {
        "name": "Stephenville TX (2008)",
        "date": "2008-01-08",
        "start": "2008-01-01",
        "end": "2008-01-31",
        "date_range": ("2008-01-01", "2008-01-31"),
        "states": ["TX"],
        "expected_shape": "light",
        "expected_phrases": ["fort worth", "miles away"],
        "type": "unexplained",
    },
    {
        "name": "O'Hare Airport (2006)",
        "date": "2006-11-07",
        "start": "2006-11-01",
        "end": "2006-12-31",
        "date_range": ("2006-11-01", "2006-12-31"),
        "states": ["IL"],
        "expected_shape": "disc",
        "expected_phrases": ["object hovering"],
        "type": "unexplained",
    },
    {
        "name": "Hudson Valley (1982-86)",
        "date": "1984-07-01",
        "start": "1982-01-01",
        "end": "1986-12-31",
        "date_range": ("1982-01-01", "1986-12-31"),
        "states": ["NY", "CT", "NJ"],
        "expected_shape": "triangle",
        "expected_phrases": ["white lights", "new york"],
        "type": "unexplained",
    },
    {
        "name": "Belgian Wave (1989-90)",
        "start": "1989-11-01",
        "end": "1990-04-30",
        "date_range": ("1989-11-01", "1990-04-30"),
        "states": None,
        "expected_shape": None,
        "expected_phrases": [],
        "type": "unexplained",
    },
    {
        "name": "Trident Missile CA (2015)",
        "date": "2015-11-07",
        "start": "2015-11-07",
        "end": "2015-11-09",
        "date_range": ("2015-11-07", "2015-11-09"),
        "states": ["CA", "AZ", "NV"],
        "expected_shape": "light",
        "expected_phrases": ["navy missile", "missile launch"],
        "type": "prosaic",
    },
    {
        "name": "SpaceX Launch CA (2017)",
        "date": "2017-12-22",
        "start": "2017-12-22",
        "end": "2017-12-24",
        "date_range": ("2017-12-22", "2017-12-24"),
        "states": ["CA", "AZ"],
        "expected_shape": "light",
        "expected_phrases": ["vandenberg", "rocket launch"],
        "type": "prosaic",
    },
    {
        "name": "Leonid Meteors (1999)",
        "date": "1999-11-17",
        "start": "1999-11-16",
        "end": "1999-11-19",
        "date_range": ("1999-11-16", "1999-11-19"),
        "states": None,
        "expected_shape": "fireball",
        "expected_phrases": ["meteor shower"],
        "type": "prosaic",
    },
    {
        "name": "Starlink Trains (2020)",
        "date": "2020-04-15",
        "start": "2020-03-01",
        "end": "2020-06-30",
        "date_range": ("2020-03-01", "2020-06-30"),
        "states": None,
        "expected_shape": "formation",
        "expected_phrases": ["straight line", "evenly spaced", "single file"],
        "type": "prosaic",
    },
    {
        "name": "July 4th Lanterns (2012)",
        "date": "2012-07-04",
        "start": "2012-07-03",
        "end": "2012-07-05",
        "date_range": ("2012-07-03", "2012-07-05"),
        "states": None,
        "expected_shape": "fireball",
        "expected_phrases": ["watching fireworks", "bright orange"],
        "type": "prosaic",
    },
    {
        "name": "NJ Drones (2024-era reports)",
        "start": "2023-06-01",
        "end": "2023-12-31",
        "date_range": ("2023-06-01", "2023-12-31"),
        "states": ["NJ", "NY"],
        "expected_shape": None,
        "expected_phrases": [],
        "type": "unexplained",
    },
]

# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------


def load_embeddings(path: Path | None = None) -> dict[str, np.ndarray]:
    """Load embedding parquet and return a dict mapping source_id -> vector.

    Uses zip() over columns instead of iterrows() for speed.
    """
    import pandas as pd

    if path is None:
        path = EMBED_PATH
    emb_df = pd.read_parquet(path)
    return {
        sid: np.array(vec, dtype=np.float32)
        for sid, vec in zip(emb_df["source_id"], emb_df["embedding"])
    }


def mean_pairwise_cosine(vecs: np.ndarray) -> float:
    """Mean pairwise cosine similarity for a matrix of row vectors.

    *vecs* should have shape (n, d). Returns 0.0 for fewer than 2 vectors.
    """
    from sklearn.metrics.pairwise import cosine_similarity

    if len(vecs) < 2:
        return 0.0
    sim = cosine_similarity(vecs)
    n = len(sim)
    # Sum upper triangle (excluding diagonal) then average
    total = sim.sum() - n  # subtract the diagonal (all 1s)
    pairs = n * (n - 1)
    return float(total / pairs) if pairs else 0.0


def closest_to_centroid(vecs: np.ndarray) -> int:
    """Return the index of the vector closest to the centroid."""
    centroid = vecs.mean(axis=0, keepdims=True)
    from sklearn.metrics.pairwise import cosine_similarity

    sims = cosine_similarity(centroid, vecs).flatten()
    return int(np.argmax(sims))


def ensure_output_dirs() -> None:
    """Create the standard output directories if they don't exist."""
    DERIVED_DIR.mkdir(parents=True, exist_ok=True)
    CHART_DIR.mkdir(parents=True, exist_ok=True)
    TABLE_DIR.mkdir(parents=True, exist_ok=True)
