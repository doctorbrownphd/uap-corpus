"""
09_validate.py

Validates the pipeline's outputs against known ground-truth events.
If the analysis can blindly surface events whose details are independently
documented, that's evidence the methodology is sound.

Method:
  1. Define a set of known events with expected properties (date, location,
     shape, approximate report count, key phrases).
  2. Check whether each event appears in:
     - Same-night clusters (Script 05)
     - Flap detections (Script 07)
     - Signature phrases (Script 08)
  3. Score each event: found/not-found in each pipeline stage, and how
     closely the pipeline's output matches the known properties.
  4. Also validate negative cases: known prosaic events (missile launches,
     meteor showers, Starlink) should cluster separately from unexplained
     events.

Outputs:
  outputs/tables/known_event_validation.csv   validation matrix
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CLEAN_PATH = ROOT / "data" / "interim" / "nuforc_clean.parquet"
CLUSTER_PATH = ROOT / "data" / "derived" / "clusters_same_night.parquet"
FLAP_PATH = ROOT / "data" / "derived" / "flaps.parquet"
SIG_PATH = ROOT / "outputs" / "tables" / "known_event_signatures.csv"
TABLE_DIR = ROOT / "outputs" / "tables"

# Ground-truth events with expected properties
KNOWN_EVENTS = [
    {
        "name": "Phoenix Lights",
        "date": "1997-03-13",
        "date_range": ("1997-03-10", "1997-03-20"),
        "states": ["AZ"],
        "expected_shape": "triangle",
        "expected_phrases": ["phoenix lights", "white lights", "air force"],
        "type": "unexplained",
    },
    {
        "name": "Tinley Park IL Lights",
        "date": "2004-10-31",
        "date_range": ("2004-10-25", "2004-11-07"),
        "states": ["IL"],
        "expected_shape": "light",
        "expected_phrases": ["red lights", "tinley park", "triangle formation"],
        "type": "unexplained",
    },
    {
        "name": "Stephenville TX",
        "date": "2008-01-08",
        "date_range": ("2008-01-01", "2008-01-31"),
        "states": ["TX"],
        "expected_shape": "light",
        "expected_phrases": ["fort worth", "miles away"],
        "type": "unexplained",
    },
    {
        "name": "O'Hare Airport Disc",
        "date": "2006-11-07",
        "date_range": ("2006-11-01", "2006-12-31"),
        "states": ["IL"],
        "expected_shape": "disc",
        "expected_phrases": ["object hovering"],
        "type": "unexplained",
    },
    {
        "name": "Hudson Valley Wave",
        "date": "1984-07-01",
        "date_range": ("1982-01-01", "1986-12-31"),
        "states": ["NY", "CT"],
        "expected_shape": "triangle",
        "expected_phrases": ["white lights", "new york"],
        "type": "unexplained",
    },
    {
        "name": "Trident Missile Launch",
        "date": "2015-11-07",
        "date_range": ("2015-11-07", "2015-11-09"),
        "states": ["CA", "AZ", "NV"],
        "expected_shape": "light",
        "expected_phrases": ["navy missile", "missile launch"],
        "type": "prosaic",
    },
    {
        "name": "SpaceX Vandenberg Launch",
        "date": "2017-12-22",
        "date_range": ("2017-12-22", "2017-12-24"),
        "states": ["CA", "AZ"],
        "expected_shape": "light",
        "expected_phrases": ["vandenberg", "rocket launch"],
        "type": "prosaic",
    },
    {
        "name": "Leonid Meteor Shower 1999",
        "date": "1999-11-17",
        "date_range": ("1999-11-16", "1999-11-19"),
        "states": None,
        "expected_shape": "fireball",
        "expected_phrases": ["meteor shower"],
        "type": "prosaic",
    },
    {
        "name": "Starlink Satellite Trains",
        "date": "2020-04-15",
        "date_range": ("2020-03-01", "2020-06-30"),
        "states": None,
        "expected_shape": "formation",
        "expected_phrases": ["straight line", "evenly spaced", "single file"],
        "type": "prosaic",
    },
    {
        "name": "July 4th Chinese Lanterns 2012",
        "date": "2012-07-04",
        "date_range": ("2012-07-03", "2012-07-05"),
        "states": None,
        "expected_shape": "fireball",
        "expected_phrases": ["watching fireworks", "bright orange"],
        "type": "prosaic",
    },
]


def check_in_clusters(event: dict, clusters: pd.DataFrame,
                       clean: pd.DataFrame) -> dict:
    """Check if the event appears in same-night clusters."""
    start = pd.Timestamp(event["date_range"][0])
    end = pd.Timestamp(event["date_range"][1])

    mask = (
        (clusters["event_date"] >= str(start.date())) &
        (clusters["event_date"] <= str(end.date()))
    )
    matching = clusters[mask]

    if matching.empty:
        return {"cluster_found": False, "cluster_count": 0,
                "cluster_max_size": 0, "cluster_ids": ""}

    # Get the reports in these clusters and check state overlap
    if event["states"]:
        sids = matching["source_id"].tolist()
        report_states = clean[clean["source_id"].isin(sids)]["state"]
        state_overlap = set(report_states) & set(event["states"])
        if not state_overlap:
            return {"cluster_found": False, "cluster_count": 0,
                    "cluster_max_size": 0, "cluster_ids": ""}

    cids = matching["cluster_id"].unique()
    sizes = matching.groupby("cluster_id")["source_id"].count()

    return {
        "cluster_found": True,
        "cluster_count": len(cids),
        "cluster_max_size": int(sizes.max()),
        "cluster_ids": ", ".join(str(c) for c in sorted(cids)[:5]),
    }


def check_in_flaps(event: dict, flaps: pd.DataFrame) -> dict:
    """Check if the event appears in detected flaps."""
    start = pd.Timestamp(event["date_range"][0])
    end = pd.Timestamp(event["date_range"][1])

    mask = (
        (flaps["start"] <= end) &
        (flaps["end"] >= start)
    )
    if event["states"]:
        mask &= flaps["state"].isin(event["states"])

    matching = flaps[mask]

    if matching.empty:
        return {"flap_found": False, "flap_count": 0,
                "flap_max_reports": 0, "flap_peak_ratio": 0}

    return {
        "flap_found": True,
        "flap_count": len(matching),
        "flap_max_reports": int(matching["n_reports"].max()),
        "flap_peak_ratio": float(matching["peak_ratio"].max()),
    }


def check_in_signatures(event: dict, sigs: pd.DataFrame) -> dict:
    """Check if expected phrases appear in the signature analysis."""
    if sigs.empty:
        return {"sig_found": False, "sig_phrases_matched": 0,
                "sig_top_phrase": "", "sig_top_score": 0}

    # Find the matching event in signature results
    # Match by checking if event name appears in the sig event names
    name_lower = event["name"].lower()
    matched_sigs = None
    for sig_event in sigs["event_name"].unique():
        # Fuzzy match: check if key words overlap
        if any(w in sig_event.lower() for w in name_lower.split()[:2]):
            matched_sigs = sigs[sigs["event_name"] == sig_event]
            break

    if matched_sigs is None or matched_sigs.empty:
        return {"sig_found": False, "sig_phrases_matched": 0,
                "sig_top_phrase": "", "sig_top_score": 0}

    # Check how many expected phrases were found
    found_phrases = matched_sigs["phrase"].str.lower().tolist()
    matches = sum(
        1 for exp in event["expected_phrases"]
        if any(exp.lower() in fp for fp in found_phrases)
    )

    top = matched_sigs.sort_values("distinctiveness", ascending=False).iloc[0]

    return {
        "sig_found": True,
        "sig_phrases_matched": matches,
        "sig_phrases_expected": len(event["expected_phrases"]),
        "sig_top_phrase": top["phrase"],
        "sig_top_score": round(float(top["distinctiveness"]), 4),
    }


def check_corpus_coverage(event: dict, clean: pd.DataFrame) -> dict:
    """How many reports does the corpus have for this event?"""
    start = pd.Timestamp(event["date_range"][0])
    end = pd.Timestamp(event["date_range"][1])

    mask = (
        (clean["event_date"] >= start) &
        (clean["event_date"] <= end)
    )
    if event["states"]:
        mask &= clean["state"].isin(event["states"])

    matching = clean[mask]

    shape_match = False
    if event["expected_shape"] and len(matching) > 0:
        top_shape = matching["shape_norm"].value_counts().index[0]
        shape_match = top_shape == event["expected_shape"]

    return {
        "corpus_reports": len(matching),
        "corpus_top_shape": matching["shape_norm"].value_counts().index[0] if len(matching) > 0 else "",
        "shape_matches": shape_match,
    }


def main():
    # Load all pipeline outputs
    print("Loading pipeline outputs...")
    clean = pd.read_parquet(CLEAN_PATH)
    clean["event_date"] = pd.to_datetime(clean["event_date"])

    clusters = pd.read_parquet(CLUSTER_PATH) if CLUSTER_PATH.exists() else pd.DataFrame()
    flaps = pd.read_parquet(FLAP_PATH) if FLAP_PATH.exists() else pd.DataFrame()
    sigs = pd.read_csv(SIG_PATH) if SIG_PATH.exists() else pd.DataFrame()

    if not flaps.empty:
        flaps["start"] = pd.to_datetime(flaps["start"])
        flaps["end"] = pd.to_datetime(flaps["end"])

    print(f"  clean: {len(clean):,}, clusters: {len(clusters):,}, "
          f"flaps: {len(flaps):,}, sig phrases: {len(sigs):,}")

    # Validate each known event
    results = []
    print(f"\nValidating {len(KNOWN_EVENTS)} known events...")
    print("=" * 100)

    for event in KNOWN_EVENTS:
        row = {"event": event["name"], "type": event["type"]}

        # Corpus coverage
        coverage = check_corpus_coverage(event, clean)
        row.update(coverage)

        # Same-night clusters
        if not clusters.empty:
            cluster_result = check_in_clusters(event, clusters, clean)
            row.update(cluster_result)
        else:
            row.update({"cluster_found": False, "cluster_count": 0,
                        "cluster_max_size": 0, "cluster_ids": ""})

        # Flaps
        if not flaps.empty:
            flap_result = check_in_flaps(event, flaps)
            row.update(flap_result)
        else:
            row.update({"flap_found": False, "flap_count": 0,
                        "flap_max_reports": 0, "flap_peak_ratio": 0})

        # Signatures
        sig_result = check_in_signatures(event, sigs)
        row.update(sig_result)

        # Overall detection score
        detections = sum([
            row.get("cluster_found", False),
            row.get("flap_found", False),
            row.get("sig_found", False),
            row.get("shape_matches", False),
        ])
        row["detections_out_of_4"] = detections

        results.append(row)

        # Print
        status = "PASS" if detections >= 2 else "PARTIAL" if detections >= 1 else "MISS"
        print(f"\n  [{status}] {event['name']} ({event['type']})")
        print(f"    corpus: {row['corpus_reports']} reports, "
              f"top shape: {row['corpus_top_shape']} "
              f"({'match' if row['shape_matches'] else 'mismatch'})")
        print(f"    cluster: {'YES' if row.get('cluster_found') else 'no'}"
              f"  (max size {row.get('cluster_max_size', 0)})")
        print(f"    flap:    {'YES' if row.get('flap_found') else 'no'}"
              f"  (peak ratio {row.get('flap_peak_ratio', 0):.1f}x, "
              f"max {row.get('flap_max_reports', 0)} reports)")
        print(f"    sig:     {'YES' if row.get('sig_found') else 'no'}"
              f"  (top: \"{row.get('sig_top_phrase', '')}\")")
        print(f"    score:   {detections}/4")

    # Summary
    results_df = pd.DataFrame(results)
    TABLE_DIR.mkdir(parents=True, exist_ok=True)
    out_path = TABLE_DIR / "known_event_validation.csv"
    results_df.to_csv(out_path, index=False)
    print(f"\nWrote {out_path}")

    # Summary stats
    print(f"\n{'='*100}")
    print("VALIDATION SUMMARY")
    print(f"{'='*100}")
    total = len(results_df)
    full_pass = (results_df["detections_out_of_4"] >= 2).sum()
    partial = ((results_df["detections_out_of_4"] >= 1) &
               (results_df["detections_out_of_4"] < 2)).sum()
    miss = (results_df["detections_out_of_4"] == 0).sum()

    print(f"  Total events tested: {total}")
    print(f"  PASS  (≥2 detections): {full_pass} ({full_pass/total*100:.0f}%)")
    print(f"  PARTIAL (1 detection): {partial} ({partial/total*100:.0f}%)")
    print(f"  MISS  (0 detections):  {miss} ({miss/total*100:.0f}%)")

    # By type
    for etype in ["unexplained", "prosaic"]:
        sub = results_df[results_df["type"] == etype]
        passed = (sub["detections_out_of_4"] >= 2).sum()
        print(f"\n  {etype.upper()} events: {passed}/{len(sub)} pass")

    # Detection method breakdown
    print(f"\n  Detection method hits:")
    for method in ["cluster_found", "flap_found", "sig_found", "shape_matches"]:
        if method in results_df.columns:
            hits = results_df[method].sum()
            print(f"    {method:20s}: {hits}/{total}")


if __name__ == "__main__":
    main()
