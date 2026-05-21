"""
06_archetypes.py

Discovers narrative archetypes in the NUFORC corpus by clustering the
full embedding space. The hypothesis: despite surface variation, witness
narratives fall into a modest number of recurring patterns (archetypes)
that map loosely to the Hynek and Vallée classification systems — but
the data may also reveal categories those systems missed.

Method:
  1. Load all 384-dim narrative embeddings.
  2. Reduce dimensionality with UMAP (to ~25 dims for clustering, 2 dims
     for visualization).
  3. Cluster with HDBSCAN (density-based, no need to pre-specify k).
  4. For each cluster, extract:
     - Most representative narrative (closest to centroid)
     - Top distinctive terms (TF-IDF within cluster vs corpus)
     - Dominant shape, decade distribution, size
  5. Manually label the archetypes based on their signatures.

Outputs:
  data/derived/archetypes.parquet           every report with its archetype label
  outputs/tables/archetype_profiles.csv     profile of each archetype
  outputs/charts/archetypes_umap.png        2D UMAP scatter colored by archetype
  outputs/charts/archetype_sizes.png        bar chart of archetype sizes
"""

import re
import sys
from collections import Counter
from pathlib import Path

import hdbscan
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from common import ROOT, CLEAN_PATH, EMBED_PATH, DERIVED_DIR, CHART_DIR, TABLE_DIR

# HDBSCAN parameters
MIN_CLUSTER_SIZE = 200
MIN_SAMPLES = 10

# UMAP parameters
UMAP_N_COMPONENTS_CLUSTER = 25   # for clustering
UMAP_N_COMPONENTS_VIZ = 2        # for visualization
UMAP_N_NEIGHBORS = 30
UMAP_MIN_DIST = 0.0              # tight clusters for HDBSCAN
UMAP_MIN_DIST_VIZ = 0.3          # spread for readability
UMAP_METRIC = "cosine"

# Subsample for UMAP fitting if corpus is huge (speeds up significantly)
UMAP_MAX_FIT = 50_000


def load_data() -> tuple[pd.DataFrame, np.ndarray, list[str]]:
    """Load reports and embeddings. Returns (df, embedding_matrix, source_ids)."""
    print(f"Reading {CLEAN_PATH}...")
    df = pd.read_parquet(CLEAN_PATH)

    print(f"Reading {EMBED_PATH}...")
    emb_df = pd.read_parquet(EMBED_PATH)

    # Align: only keep reports that have embeddings
    emb_dict = {
        sid: vec for sid, vec in zip(emb_df["source_id"], emb_df["embedding"])
    }
    mask = df["source_id"].isin(emb_dict)
    df = df[mask].reset_index(drop=True)

    source_ids = df["source_id"].tolist()
    matrix = np.array([emb_dict[sid] for sid in source_ids], dtype=np.float32)

    print(f"  {len(df):,} reports, {matrix.shape[1]}-dim embeddings")
    return df, matrix, source_ids


def reduce_umap(matrix: np.ndarray, n_components: int, min_dist: float,
                label: str) -> np.ndarray:
    """Reduce embedding dimensions with UMAP."""
    try:
        import umap
    except ImportError:
        # UMAP is optional; fall back to PCA
        print(f"  umap not installed, falling back to PCA for {label}")
        from sklearn.decomposition import PCA
        if matrix.shape[0] > UMAP_MAX_FIT:
            pca = PCA(n_components=n_components)
            pca.fit(matrix[np.random.choice(len(matrix), UMAP_MAX_FIT, replace=False)])
            return pca.transform(matrix)
        return PCA(n_components=n_components).fit_transform(matrix)

    print(f"  UMAP {label}: {matrix.shape[1]}d -> {n_components}d ...")
    reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=UMAP_N_NEIGHBORS,
        min_dist=min_dist,
        metric=UMAP_METRIC,
        random_state=42,
        low_memory=True,
    )
    if matrix.shape[0] > UMAP_MAX_FIT:
        sample_idx = np.random.RandomState(42).choice(
            len(matrix), UMAP_MAX_FIT, replace=False
        )
        reducer.fit(matrix[sample_idx])
        return reducer.transform(matrix)
    return reducer.fit_transform(matrix)


def run_hdbscan(reduced: np.ndarray) -> np.ndarray:
    """Cluster the reduced embeddings with HDBSCAN."""
    print(f"  HDBSCAN: min_cluster_size={MIN_CLUSTER_SIZE}, min_samples={MIN_SAMPLES}")
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=MIN_CLUSTER_SIZE,
        min_samples=MIN_SAMPLES,
        metric="euclidean",
        cluster_selection_method="eom",
        core_dist_n_jobs=-1,
    )
    labels = clusterer.fit_predict(reduced)
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = (labels == -1).sum()
    print(f"  found {n_clusters} clusters, {n_noise:,} noise points "
          f"({n_noise/len(labels)*100:.1f}%)")
    return labels


def extract_distinctive_terms(df: pd.DataFrame, labels: np.ndarray,
                               n_terms: int = 10) -> dict[int, list[str]]:
    """For each cluster, find the terms most distinctive vs the rest of
    the corpus using TF-IDF class comparison."""
    print("Extracting distinctive terms per archetype...")

    # Build one pseudo-document per cluster (concat all narratives)
    cluster_ids = sorted(set(labels) - {-1})
    docs = []
    for cid in cluster_ids:
        mask = labels == cid
        combined = " ".join(df.loc[mask, "narrative"].tolist())
        docs.append(combined)

    tfidf = TfidfVectorizer(
        max_features=10000,
        stop_words="english",
        min_df=2,
        ngram_range=(1, 2),
        token_pattern=r"\b[a-z][a-z]+\b",
    )
    tfidf_matrix = tfidf.fit_transform(docs)
    feature_names = tfidf.get_feature_names_out()

    distinctive = {}
    for i, cid in enumerate(cluster_ids):
        scores = tfidf_matrix[i].toarray().flatten()
        top_idx = scores.argsort()[-n_terms:][::-1]
        distinctive[cid] = [feature_names[j] for j in top_idx]

    return distinctive


def profile_clusters(df: pd.DataFrame, matrix: np.ndarray,
                      labels: np.ndarray,
                      distinctive: dict[int, list[str]]) -> pd.DataFrame:
    """Build a profile for each archetype cluster."""
    cluster_ids = sorted(set(labels) - {-1})
    profiles = []

    for cid in cluster_ids:
        mask = labels == cid
        cdf = df[mask]
        cvecs = matrix[mask]

        # Representative narrative: closest to centroid
        centroid = cvecs.mean(axis=0, keepdims=True)
        dists = 1 - cosine_similarity(centroid, cvecs)[0]
        rep_idx = dists.argmin()
        rep_narrative = cdf.iloc[rep_idx]["narrative"]

        # Shape distribution
        shapes = cdf["shape_norm"].value_counts()
        top_shape = shapes.index[0] if len(shapes) > 0 else ""

        # Decade distribution
        decades = cdf["event_decade"].value_counts().sort_index()
        peak_decade = decades.idxmax()

        # Internal coherence
        if len(cvecs) > 1:
            sample_n = min(500, len(cvecs))
            rng = np.random.RandomState(42)
            sample_idx = rng.choice(len(cvecs), sample_n, replace=False)
            sim = cosine_similarity(cvecs[sample_idx])
            triu = np.triu_indices(sample_n, k=1)
            mean_sim = sim[triu].mean()
        else:
            mean_sim = 1.0

        profiles.append({
            "archetype_id": cid,
            "n_reports": int(mask.sum()),
            "pct_of_corpus": round(mask.sum() / len(df) * 100, 1),
            "top_shape": top_shape,
            "top_3_shapes": ", ".join(shapes.head(3).index.tolist()),
            "peak_decade": int(peak_decade),
            "n_states": int(cdf["state"].nunique()),
            "mean_cosine_sim": round(float(mean_sim), 3),
            "distinctive_terms": ", ".join(distinctive.get(cid, [])),
            "representative_narrative": rep_narrative[:300],
        })

    return pd.DataFrame(profiles).sort_values("n_reports", ascending=False)


def plot_umap(df: pd.DataFrame, coords_2d: np.ndarray, labels: np.ndarray,
              out_path: Path) -> None:
    """2D UMAP scatter plot colored by archetype."""
    fig, ax = plt.subplots(figsize=(14, 10))

    # Plot noise first (grey, small)
    noise_mask = labels == -1
    ax.scatter(coords_2d[noise_mask, 0], coords_2d[noise_mask, 1],
               c="#cccccc", s=1, alpha=0.15, label="unclustered", rasterized=True)

    # Plot each cluster
    cluster_ids = sorted(set(labels) - {-1})
    cmap = plt.cm.get_cmap("tab20", len(cluster_ids))
    for i, cid in enumerate(cluster_ids):
        mask = labels == cid
        ax.scatter(coords_2d[mask, 0], coords_2d[mask, 1],
                   c=[cmap(i)], s=3, alpha=0.4, label=f"A{cid}", rasterized=True)

    ax.set_xlabel("UMAP 1", fontsize=11)
    ax.set_ylabel("UMAP 2", fontsize=11)
    ax.set_title("NUFORC narrative archetypes (UMAP projection)",
                 fontsize=14, fontweight="bold")

    # Legend: only show if manageable number of clusters
    if len(cluster_ids) <= 25:
        ax.legend(loc="upper right", fontsize=7, ncol=2, markerscale=4)

    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {out_path}")


def plot_sizes(profiles: pd.DataFrame, out_path: Path) -> None:
    """Horizontal bar chart of archetype sizes."""
    prof = profiles.sort_values("n_reports", ascending=True)

    fig, ax = plt.subplots(figsize=(10, max(6, len(prof) * 0.4)))
    bars = ax.barh(range(len(prof)), prof["n_reports"],
                    color="#4878CF", alpha=0.8)
    ax.set_yticks(range(len(prof)))
    labels = [
        f"A{row.archetype_id}: {row.distinctive_terms.split(',')[0].strip()}"
        for _, row in prof.iterrows()
    ]
    ax.set_yticklabels(labels, fontsize=9)
    ax.set_xlabel("Number of reports", fontsize=11)
    ax.set_title("Narrative archetype sizes", fontsize=13, fontweight="bold")

    # Annotate percentages
    for i, (_, row) in enumerate(prof.iterrows()):
        ax.text(row.n_reports + 50, i, f"{row.pct_of_corpus}%",
                va="center", fontsize=8, color="#666666")

    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {out_path}")


def main():
    for path in (CLEAN_PATH, EMBED_PATH):
        if not path.exists():
            sys.exit(f"Input not found: {path}")

    df, matrix, source_ids = load_data()

    # Step 1: UMAP reduction for clustering
    print("\nDimensionality reduction...")
    reduced = reduce_umap(matrix, UMAP_N_COMPONENTS_CLUSTER,
                           UMAP_MIN_DIST, "clustering")

    # Step 2: HDBSCAN
    print("\nClustering...")
    labels = run_hdbscan(reduced)

    # Step 3: UMAP 2D for visualization
    print("\n2D projection for visualization...")
    coords_2d = reduce_umap(matrix, UMAP_N_COMPONENTS_VIZ,
                              UMAP_MIN_DIST_VIZ, "visualization")

    # Step 4: Extract distinctive terms
    distinctive = extract_distinctive_terms(df, labels)

    # Step 5: Profile clusters
    print("\nProfiling archetypes...")
    profiles = profile_clusters(df, matrix, labels, distinctive)

    # --- Outputs ---
    DERIVED_DIR.mkdir(parents=True, exist_ok=True)
    TABLE_DIR.mkdir(parents=True, exist_ok=True)
    CHART_DIR.mkdir(parents=True, exist_ok=True)

    # Save per-report archetype assignments
    df["archetype"] = labels
    df["umap_x"] = coords_2d[:, 0]
    df["umap_y"] = coords_2d[:, 1]
    out_path = DERIVED_DIR / "archetypes.parquet"
    df.to_parquet(out_path, index=False)
    print(f"\nWrote {out_path} ({len(df):,} reports)")

    # Save profiles
    prof_path = TABLE_DIR / "archetype_profiles.csv"
    profiles.to_csv(prof_path, index=False)
    print(f"Wrote {prof_path}")

    # Print profiles
    print(f"\n{'='*90}")
    print(f"ARCHETYPE PROFILES ({len(profiles)} archetypes)")
    print(f"{'='*90}")
    for _, row in profiles.iterrows():
        print(f"\n  Archetype {row.archetype_id}  "
              f"({row.n_reports:,} reports, {row.pct_of_corpus}%)")
        print(f"  Top shapes: {row.top_3_shapes}")
        print(f"  Peak decade: {row.peak_decade}s")
        print(f"  Coherence: {row.mean_cosine_sim}")
        print(f"  Terms: {row.distinctive_terms}")
        print(f"  Representative: \"{row.representative_narrative[:150]}\"")

    # Charts
    print(f"\nGenerating charts...")
    plot_umap(df, coords_2d, labels, CHART_DIR / "archetypes_umap.png")
    plot_sizes(profiles, CHART_DIR / "archetype_sizes.png")

    # Summary
    clustered = (labels != -1).sum()
    print(f"\nSummary:")
    print(f"  {len(profiles)} archetypes discovered")
    print(f"  {clustered:,}/{len(df):,} reports assigned ({clustered/len(df)*100:.1f}%)")
    print(f"  {(labels == -1).sum():,} unclustered (unique/hybrid narratives)")


if __name__ == "__main__":
    main()
