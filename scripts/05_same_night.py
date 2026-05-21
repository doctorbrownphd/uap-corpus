"""
05_same_night.py

Finds clusters of independent witnesses who filed similar reports on the
same night. The hypothesis: if independent people in different locations
describe the same thing on the same evening, the narrative consistency
is notable regardless of what caused the sighting.

Method:
  1. Group reports by event_date.
  2. For dates with ≥3 reports, compute pairwise cosine similarity of
     their narrative embeddings.
  3. Within each date, run agglomerative clustering on the embedding
     vectors with a cosine distance threshold. Reports that cluster
     together on the same night are a "same-night event."
  4. Score each cluster by: size (n witnesses), geographic spread
     (n distinct states), and narrative coherence (mean pairwise
     cosine similarity).
  5. Rank and output the top clusters with representative narratives.

Outputs:
  data/derived/clusters_same_night.parquet   all clustered reports
  outputs/tables/same_night_top_clusters.csv top 50 clusters summary
  outputs/charts/same_night_cluster_sizes.png distribution of cluster sizes
  outputs/charts/same_night_timeline.png      top clusters on a timeline
"""

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity

from common import ROOT, CLEAN_PATH, EMBED_PATH, DERIVED_DIR, CHART_DIR, TABLE_DIR, load_embeddings

# Clustering parameters
MIN_REPORTS_PER_DATE = 3       # need at least 3 reports to attempt clustering
COSINE_DISTANCE_THRESHOLD = 0.35  # max cosine distance within a cluster
MIN_CLUSTER_SIZE = 3           # discard clusters smaller than this


def load_data() -> tuple[pd.DataFrame, dict[str, np.ndarray]]:
    """Load cleaned reports and their embeddings. Return the dataframe
    and a dict mapping source_id -> embedding vector."""
    print(f"Reading {CLEAN_PATH}...")
    df = pd.read_parquet(CLEAN_PATH)
    print(f"  {len(df):,} reports")

    print(f"Reading {EMBED_PATH}...")
    emb_lookup = load_embeddings(EMBED_PATH)
    print(f"  {len(emb_lookup):,} embeddings")

    # Filter df to only rows with embeddings
    has_emb = df["source_id"].isin(emb_lookup)
    df = df[has_emb].copy()
    print(f"  matched: {len(df):,} reports with embeddings")

    return df, emb_lookup


def cluster_single_date(
    date_df: pd.DataFrame,
    emb_lookup: dict[str, np.ndarray],
) -> list[dict]:
    """Run agglomerative clustering on reports from a single date.
    Returns a list of cluster dicts."""
    sids = date_df["source_id"].values
    vecs = np.array([emb_lookup[sid] for sid in sids])

    if len(vecs) < MIN_REPORTS_PER_DATE:
        return []

    # Agglomerative clustering with cosine distance
    clustering = AgglomerativeClustering(
        n_clusters=None,
        metric="cosine",
        linkage="average",
        distance_threshold=COSINE_DISTANCE_THRESHOLD,
    )
    labels = clustering.fit_predict(vecs)

    clusters = []
    for label in set(labels):
        mask = labels == label
        if mask.sum() < MIN_CLUSTER_SIZE:
            continue

        cluster_sids = sids[mask]
        cluster_vecs = vecs[mask]
        cluster_rows = date_df.iloc[mask]

        # Pairwise cosine similarity within cluster
        sim_matrix = cosine_similarity(cluster_vecs)
        # Mean of upper triangle (excluding diagonal)
        n = len(cluster_vecs)
        triu_indices = np.triu_indices(n, k=1)
        mean_sim = sim_matrix[triu_indices].mean() if n > 1 else 1.0

        clusters.append({
            "source_ids": list(cluster_sids),
            "n_reports": int(mask.sum()),
            "n_states": int(cluster_rows["state"].nunique()),
            "states": sorted(cluster_rows["state"].unique().tolist()),
            "n_cities": int(cluster_rows["city"].nunique()),
            "mean_cosine_sim": float(mean_sim),
            "event_date": str(cluster_rows["event_date"].iloc[0]),
            "event_year": int(cluster_rows["event_year"].iloc[0]),
            "shapes": cluster_rows["shape_norm"].value_counts().to_dict(),
            "narratives": cluster_rows["narrative"].tolist(),
            "cities": cluster_rows["city"].tolist(),
        })

    return clusters


def score_cluster(c: dict) -> float:
    """Score a cluster for ranking. Balances size, geographic spread,
    and narrative coherence."""
    # More witnesses = more interesting
    size_score = min(c["n_reports"] / 10.0, 1.0)
    # More states = more geographically independent
    spread_score = min(c["n_states"] / 5.0, 1.0)
    # Higher cosine similarity = more coherent narratives
    coherence_score = c["mean_cosine_sim"]
    return (size_score * 0.3) + (spread_score * 0.3) + (coherence_score * 0.4)


def summarize_narrative(narrative: str, max_chars: int = 200) -> str:
    """Truncate a narrative for the summary table."""
    if len(narrative) <= max_chars:
        return narrative
    return narrative[:max_chars].rsplit(" ", 1)[0] + "..."


def main():
    for path in (CLEAN_PATH, EMBED_PATH):
        if not path.exists():
            sys.exit(f"Input not found: {path}")

    df, emb_lookup = load_data()

    # Group by date, only process dates with enough reports
    date_groups = df.groupby("event_date")
    eligible_dates = [
        date for date, group in date_groups
        if len(group) >= MIN_REPORTS_PER_DATE
    ]
    print(f"\n{len(eligible_dates):,} dates with {MIN_REPORTS_PER_DATE}+ reports")

    # Cluster each eligible date
    print("Clustering by date...")
    all_clusters = []
    for i, date in enumerate(eligible_dates):
        group = date_groups.get_group(date)
        clusters = cluster_single_date(group, emb_lookup)
        all_clusters.extend(clusters)
        if (i + 1) % 2000 == 0:
            print(f"  processed {i+1:,}/{len(eligible_dates):,} dates, "
                  f"{len(all_clusters):,} clusters so far")

    print(f"\nFound {len(all_clusters):,} same-night clusters "
          f"(≥{MIN_CLUSTER_SIZE} reports, cosine dist ≤{COSINE_DISTANCE_THRESHOLD})")

    if not all_clusters:
        print("No clusters found. Try relaxing thresholds.")
        return

    # Score and rank
    for c in all_clusters:
        c["score"] = score_cluster(c)
    all_clusters.sort(key=lambda c: c["score"], reverse=True)

    # Assign cluster IDs
    for i, c in enumerate(all_clusters):
        c["cluster_id"] = i

    # --- Output 1: all clustered reports (long form) ---
    DERIVED_DIR.mkdir(parents=True, exist_ok=True)
    rows_out = []
    for c in all_clusters:
        for j, sid in enumerate(c["source_ids"]):
            rows_out.append({
                "cluster_id": c["cluster_id"],
                "source_id": sid,
                "event_date": c["event_date"],
                "n_reports": c["n_reports"],
                "n_states": c["n_states"],
                "mean_cosine_sim": c["mean_cosine_sim"],
                "score": c["score"],
            })
    cluster_df = pd.DataFrame(rows_out)
    out_path = DERIVED_DIR / "clusters_same_night.parquet"
    cluster_df.to_parquet(out_path, index=False)
    print(f"\nWrote {out_path} ({len(cluster_df):,} report-cluster assignments)")

    # --- Output 2: top clusters summary ---
    TABLE_DIR.mkdir(parents=True, exist_ok=True)
    top_n = min(50, len(all_clusters))
    top_rows = []
    for c in all_clusters[:top_n]:
        # Pick the most representative narrative (closest to centroid)
        sids = c["source_ids"]
        vecs = np.array([emb_lookup[sid] for sid in sids])
        centroid = vecs.mean(axis=0)
        dists = 1 - cosine_similarity([centroid], vecs)[0]
        best_idx = dists.argmin()

        top_shape = max(c["shapes"], key=c["shapes"].get) if c["shapes"] else ""

        top_rows.append({
            "cluster_id": c["cluster_id"],
            "event_date": c["event_date"],
            "n_reports": c["n_reports"],
            "n_states": c["n_states"],
            "n_cities": c["n_cities"],
            "states": ", ".join(c["states"]),
            "top_shape": top_shape,
            "mean_cosine_sim": round(c["mean_cosine_sim"], 3),
            "score": round(c["score"], 3),
            "representative_narrative": summarize_narrative(c["narratives"][best_idx]),
        })

    top_df = pd.DataFrame(top_rows)
    top_path = TABLE_DIR / "same_night_top_clusters.csv"
    top_df.to_csv(top_path, index=False)
    print(f"Wrote {top_path}")

    # Print top 15
    print(f"\nTop 15 same-night clusters:")
    print("-" * 90)
    for _, row in top_df.head(15).iterrows():
        print(f"  #{row['cluster_id']:3d}  {row['event_date']}  "
              f"{row['n_reports']:2d} reports, {row['n_states']:2d} states  "
              f"sim={row['mean_cosine_sim']:.3f}  shape={row['top_shape']}")
        print(f"        states: {row['states']}")
        print(f"        \"{row['representative_narrative'][:120]}\"")
        print()

    # --- Output 3: cluster size distribution ---
    CHART_DIR.mkdir(parents=True, exist_ok=True)
    sizes = [c["n_reports"] for c in all_clusters]

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    ax = axes[0]
    ax.hist(sizes, bins=range(MIN_CLUSTER_SIZE, max(sizes) + 2),
            color="#4878CF", alpha=0.8, edgecolor="white")
    ax.set_xlabel("Reports per cluster", fontsize=11)
    ax.set_ylabel("Number of clusters", fontsize=11)
    ax.set_title("Same-night cluster sizes", fontsize=13, fontweight="bold")

    # --- Output 4: timeline ---
    ax = axes[1]
    top_for_plot = all_clusters[:100]
    years = [c["event_year"] for c in top_for_plot]
    n_reports = [c["n_reports"] for c in top_for_plot]
    sims = [c["mean_cosine_sim"] for c in top_for_plot]

    scatter = ax.scatter(years, n_reports, c=sims, s=50, alpha=0.7,
                          cmap="YlOrRd", vmin=0.5, vmax=1.0, edgecolors="grey",
                          linewidths=0.5)
    plt.colorbar(scatter, ax=ax, label="Mean cosine similarity")
    ax.set_xlabel("Year", fontsize=11)
    ax.set_ylabel("Reports in cluster", fontsize=11)
    ax.set_title("Top 100 same-night events", fontsize=13, fontweight="bold")

    plt.tight_layout()
    chart_path = CHART_DIR / "same_night_clusters.png"
    fig.savefig(chart_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"\nWrote {chart_path}")

    # Stats
    print(f"\nSummary statistics:")
    print(f"  Total clusters: {len(all_clusters):,}")
    print(f"  Total reports in clusters: {len(cluster_df):,}")
    print(f"  Reports clustered: {len(cluster_df):,}/{len(df):,} "
          f"({len(cluster_df)/len(df)*100:.1f}%)")
    print(f"  Median cluster size: {np.median(sizes):.0f}")
    print(f"  Largest cluster: {max(sizes)} reports")
    print(f"  Multi-state clusters: "
          f"{sum(1 for c in all_clusters if c['n_states'] > 1):,}")


if __name__ == "__main__":
    main()
