"""
08_signatures.py

Extracts distinctive phrases that characterize specific known UFO events
and time periods. The idea: certain phrases are used almost exclusively
in reports from a specific event or era, making them "linguistic
fingerprints" of that event.

Method:
  1. Define a set of known events (by date range + geographic filter).
  2. For each event, extract its reports from the corpus.
  3. Compute TF-IDF bigrams and trigrams for the event's reports vs the
     rest of the corpus.
  4. Rank by TF-IDF score to find the most distinctive phrases.
  5. Also run an unsupervised scan: for each same-night cluster (from
     Script 05), extract its distinctive phrases.

Outputs:
  data/derived/signature_phrases.parquet     phrases per event/cluster
  outputs/tables/known_event_signatures.csv  distinctive phrases per known event
  outputs/tables/cluster_signatures.csv      top phrases per same-night cluster
  outputs/charts/signature_wordcloud.png     word clouds for top events (if wordcloud installed)
"""

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

from common import ROOT, CLEAN_PATH, DERIVED_DIR, CHART_DIR, TABLE_DIR, KNOWN_EVENTS

CLUSTER_PATH = ROOT / "data" / "derived" / "clusters_same_night.parquet"


def load_data() -> pd.DataFrame:
    df = pd.read_parquet(CLEAN_PATH)
    df["event_date"] = pd.to_datetime(df["event_date"])
    print(f"Loaded {len(df):,} reports")
    return df


def get_event_mask(df: pd.DataFrame, event: dict) -> pd.Series:
    """Build a boolean mask for reports belonging to a known event."""
    mask = (
        (df["event_date"] >= pd.Timestamp(event["start"])) &
        (df["event_date"] <= pd.Timestamp(event["end"]))
    )
    if event.get("states"):
        mask &= df["state"].isin(event["states"])
    return mask


def extract_signatures(event_narratives: list[str],
                        background_narratives: list[str],
                        n_phrases: int = 20) -> list[dict]:
    """Compare event narratives against background corpus using TF-IDF.
    Returns the most distinctive ngrams for the event."""
    if len(event_narratives) < 3:
        return []

    # Combine into two documents: event vs background
    event_doc = " ".join(event_narratives)
    bg_doc = " ".join(background_narratives[:50000])  # cap background for speed

    tfidf = TfidfVectorizer(
        ngram_range=(2, 3),
        max_features=8000,
        stop_words="english",
        min_df=1,
        token_pattern=r"\b[a-z][a-z]+\b",
        sublinear_tf=True,
    )
    matrix = tfidf.fit_transform([event_doc, bg_doc])
    features = tfidf.get_feature_names_out()

    # Event scores minus background scores = distinctiveness
    event_scores = matrix[0].toarray().flatten()
    bg_scores = matrix[1].toarray().flatten()
    distinctiveness = event_scores - bg_scores

    top_idx = distinctiveness.argsort()[-n_phrases:][::-1]

    results = []
    for idx in top_idx:
        score = distinctiveness[idx]
        if score <= 0:
            break
        # Count actual occurrences in event narratives
        phrase = features[idx]
        count = sum(1 for n in event_narratives if phrase in n.lower())
        results.append({
            "phrase": phrase,
            "distinctiveness": round(float(score), 4),
            "event_count": count,
            "event_rate_pct": round(count / len(event_narratives) * 100, 1),
        })

    return results


def process_known_events(df: pd.DataFrame) -> pd.DataFrame:
    """Extract signature phrases for each known event."""
    all_narratives = df["narrative"].tolist()
    results = []

    for event in KNOWN_EVENTS:
        mask = get_event_mask(df, event)
        n = mask.sum()
        if n < 3:
            print(f"  {event['name']}: only {n} reports, skipping")
            continue

        event_narratives = df.loc[mask, "narrative"].tolist()
        bg_narratives = df.loc[~mask, "narrative"].tolist()

        sigs = extract_signatures(event_narratives, bg_narratives)
        print(f"  {event['name']}: {n} reports, {len(sigs)} phrases")

        for sig in sigs:
            sig["event_name"] = event["name"]
            sig["event_n_reports"] = n
            results.append(sig)

    return pd.DataFrame(results)


def process_clusters(df: pd.DataFrame) -> pd.DataFrame:
    """Extract signature phrases for the top same-night clusters."""
    if not CLUSTER_PATH.exists():
        print("  no cluster file found, skipping cluster signatures")
        return pd.DataFrame()

    clusters = pd.read_parquet(CLUSTER_PATH)
    all_bg = df["narrative"].tolist()

    # Process top 50 clusters by score
    top_clusters = (
        clusters.groupby("cluster_id")
        .agg({"n_reports": "first", "score": "first", "event_date": "first"})
        .sort_values("score", ascending=False)
        .head(50)
    )

    results = []
    for cid, row in top_clusters.iterrows():
        sids = clusters[clusters["cluster_id"] == cid]["source_id"].tolist()
        mask = df["source_id"].isin(sids)
        event_narratives = df.loc[mask, "narrative"].tolist()
        bg_narratives = df.loc[~mask, "narrative"].tolist()

        if len(event_narratives) < 3:
            continue

        sigs = extract_signatures(event_narratives, bg_narratives, n_phrases=10)
        for sig in sigs:
            sig["cluster_id"] = cid
            sig["event_date"] = str(row["event_date"])
            sig["n_reports"] = int(row["n_reports"])
            results.append(sig)

    return pd.DataFrame(results)


def plot_signature_panels(event_sigs: pd.DataFrame, out_path: Path) -> None:
    """Bar chart panels showing top phrases for each known event."""
    events = event_sigs["event_name"].unique()
    n_events = len(events)
    if n_events == 0:
        return

    ncols = 3
    nrows = (n_events + ncols - 1) // ncols
    fig, axes = plt.subplots(nrows, ncols, figsize=(18, nrows * 3.5))
    axes = axes.flatten()

    for i, event_name in enumerate(events):
        ax = axes[i]
        edf = event_sigs[event_sigs["event_name"] == event_name].head(10)
        if edf.empty:
            ax.set_visible(False)
            continue

        edf = edf.sort_values("distinctiveness", ascending=True)
        ax.barh(range(len(edf)), edf["distinctiveness"],
                color="#4878CF", alpha=0.8)
        ax.set_yticks(range(len(edf)))
        ax.set_yticklabels(edf["phrase"], fontsize=8)

        n_reports = edf["event_n_reports"].iloc[0]
        ax.set_title(f"{event_name}\n({n_reports} reports)",
                     fontsize=9, fontweight="bold")
        ax.set_xlabel("Distinctiveness", fontsize=8)

    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)

    fig.suptitle("Signature phrases by known UFO event",
                 fontsize=14, fontweight="bold", y=1.02)
    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {out_path}")


def main():
    if not CLEAN_PATH.exists():
        sys.exit(f"Input not found: {CLEAN_PATH}")

    df = load_data()

    # Known events
    print("\nExtracting signatures for known events...")
    event_sigs = process_known_events(df)

    if not event_sigs.empty:
        TABLE_DIR.mkdir(parents=True, exist_ok=True)
        out = TABLE_DIR / "known_event_signatures.csv"
        event_sigs.to_csv(out, index=False)
        print(f"\nWrote {out}")

        # Print highlights
        print(f"\n{'='*80}")
        print("SIGNATURE PHRASES BY EVENT")
        print(f"{'='*80}")
        for event_name in event_sigs["event_name"].unique():
            edf = event_sigs[event_sigs["event_name"] == event_name].head(8)
            n = edf["event_n_reports"].iloc[0]
            print(f"\n  {event_name} ({n} reports):")
            for _, row in edf.iterrows():
                print(f"    \"{row['phrase']}\"  "
                      f"(in {row['event_rate_pct']}% of reports, "
                      f"score={row['distinctiveness']:.3f})")

    # Same-night clusters
    print(f"\nExtracting signatures for top same-night clusters...")
    cluster_sigs = process_clusters(df)

    if not cluster_sigs.empty:
        out = TABLE_DIR / "cluster_signatures.csv"
        cluster_sigs.to_csv(out, index=False)
        print(f"Wrote {out}")

    # Combined output
    DERIVED_DIR.mkdir(parents=True, exist_ok=True)
    all_sigs = pd.concat([event_sigs, cluster_sigs], ignore_index=True)
    all_sigs.to_parquet(DERIVED_DIR / "signature_phrases.parquet", index=False)
    print(f"Wrote {DERIVED_DIR / 'signature_phrases.parquet'}")

    # Charts
    CHART_DIR.mkdir(parents=True, exist_ok=True)
    if not event_sigs.empty:
        plot_signature_panels(event_sigs, CHART_DIR / "signature_phrases.png")

    print("\nDone.")


if __name__ == "__main__":
    main()
