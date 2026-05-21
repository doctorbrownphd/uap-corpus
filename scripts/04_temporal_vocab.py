"""
04_temporal_vocab.py

Tracks how specific UFO-related terms rise and fall across decades in the
NUFORC corpus. The hypothesis: witness vocabulary tracks available cultural
language, so terms like "flying saucer", "triangle", "orb", "drone", and
"tic-tac" should appear and peak at culturally identifiable moments.

Method:
  1. Define a vocabulary of culturally significant UFO terms, grouped by
     semantic category (shape descriptors, behavior descriptors, reference
     terms, cultural-era markers).
  2. For each term, compute its frequency per 1,000 narratives in each
     5-year bin (to smooth the sparse early decades without losing the
     2010s granularity).
  3. Produce a small-multiples grid showing each term's rise and fall.
  4. Produce a summary table of peak periods.

Outputs:
  outputs/charts/vocab_over_time.png       small-multiples grid
  outputs/charts/vocab_top_terms.png       top 20 terms by peak frequency
  outputs/charts/vocab_era_signature.png   era-signature heatmap
  outputs/tables/vocab_temporal.csv        full frequency table
  outputs/tables/vocab_peaks.csv           peak period per term
"""

import re
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

ROOT = Path(__file__).resolve().parent.parent
IN_PATH = ROOT / "data" / "interim" / "nuforc_clean.parquet"
CHART_DIR = ROOT / "outputs" / "charts"
TABLE_DIR = ROOT / "outputs" / "tables"

# --- Vocabulary ---
# Terms grouped by category. Each term is a regex pattern (case-insensitive).
# Using word boundaries to avoid false positives (e.g., "light" in "slightly").
VOCAB = {
    # Shape descriptors — the classics
    "flying saucer": r"\bflying saucer",
    "saucer": r"\bsaucer\b",
    "disc/disk": r"\bdi(?:sc|sk)\b",
    "cigar": r"\bcigar\b",
    "triangle": r"\btriangle\b",
    "triangular": r"\btriangular\b",
    "V-shape": r"\bv[- ]?shape",
    "chevron": r"\bchevron\b",
    "boomerang": r"\bboomerang\b",
    "sphere": r"\bsphere\b",
    "orb": r"\borb\b",
    "oval": r"\boval\b",
    "cylinder": r"\bcylinder\b",
    "rectangle": r"\brectangle\b",
    "diamond": r"\bdiamond\b",
    "cross": r"\bcross[- ]?shape",
    "egg": r"\begg[- ]?shape",
    "fireball": r"\bfireball\b",
    "star-like": r"\bstar[- ]?like\b",

    # Behavior descriptors
    "hovering": r"\bhovert?(ing|ed)\b",
    "zigzag": r"\bzig[- ]?zag",
    "pulsing": r"\bpuls(?:ing|ed|ating)\b",
    "silent": r"\bsilent\b",
    "humming": r"\bhumm(?:ing|ed)\b",
    "blinking": r"\bblink(?:ing|ed)\b",
    "darting": r"\bdart(?:ing|ed)\b",
    "formation": r"\bformation\b",
    "disappeared": r"\bdisappear(?:ed|ing)\b",
    "shot up": r"\bshot up\b",
    "took off": r"\btook off\b",

    # Color terms (interesting for era tracking)
    "orange": r"\borange\b",
    "red light": r"\bred light",
    "green light": r"\bgreen light",
    "white light": r"\bwhite light",
    "amber": r"\bamber\b",

    # Cultural-era markers
    "drone": r"\bdrone\b",
    "tic-tac": r"\btic[- ]?tac\b",
    "tic tac": r"\btic tac\b",
    "UAP": r"\bUAP\b",
    "UFO": r"\bUFO\b",
    "alien": r"\balien\b",
    "military": r"\bmilitary\b",
    "satellite": r"\bsatellite\b",
    "Starlink": r"\b[Ss]tarlink\b",
    "Chinese lantern": r"\b[Cc]hinese lantern",
    "flare": r"\bflare\b",
    "meteor": r"\bmeteor\b",
    "ISS": r"\bISS\b",
    "space station": r"\bspace station\b",
    "jet": r"\bjet\b",
    "helicopter": r"\bhelicopter\b",
    "aircraft": r"\baircraft\b",
    "abduction": r"\babduct(?:ion|ed)\b",
    "missing time": r"\bmissing time\b",
    "beam": r"\bbeam\b",
    "landing": r"\blanding\b",
    "occupant": r"\boccupant\b",
    "entity": r"\bentit(?:y|ies)\b",
}

# Merge near-duplicates for cleaner analysis
MERGE_TERMS = {
    "tic-tac": ["tic-tac", "tic tac"],
    "triangle/triangular": ["triangle", "triangular"],
}

# Minimum total occurrences to include in charts (filters noise terms)
MIN_TOTAL_COUNT = 20

# Use 5-year bins to smooth sparse early decades
BIN_SIZE = 5


def count_terms(df: pd.DataFrame) -> pd.DataFrame:
    """Count each vocabulary term per row. Returns a boolean DataFrame
    (rows x terms) indicating presence."""
    results = {}
    narratives = df["narrative"].str.lower()
    for term, pattern in VOCAB.items():
        results[term] = narratives.str.contains(pattern, regex=True, na=False)
    return pd.DataFrame(results, index=df.index)


def bin_years(years: pd.Series, bin_size: int = BIN_SIZE) -> pd.Series:
    """Bin years into periods like 1950-1954, 1955-1959, etc."""
    return (years // bin_size) * bin_size


def compute_frequencies(df: pd.DataFrame, term_hits: pd.DataFrame) -> pd.DataFrame:
    """Compute term frequency per 1,000 narratives in each time bin."""
    df = df.copy()
    df["time_bin"] = bin_years(df["event_year"])

    # Count narratives per bin
    bin_counts = df.groupby("time_bin").size().rename("n_narratives")

    # Count term hits per bin
    term_hits = term_hits.copy()
    term_hits["time_bin"] = df["time_bin"].values
    term_per_bin = term_hits.groupby("time_bin").sum()

    # Rate per 1,000
    freq = term_per_bin.div(bin_counts, axis=0) * 1000

    return freq


def merge_duplicate_terms(freq: pd.DataFrame) -> pd.DataFrame:
    """Merge near-duplicate terms (e.g., tic-tac + tic tac)."""
    for merged_name, components in MERGE_TERMS.items():
        present = [c for c in components if c in freq.columns]
        if len(present) > 1:
            freq[merged_name] = freq[present].sum(axis=1)
            to_drop = [c for c in present if c != merged_name]
            freq = freq.drop(columns=to_drop)
    return freq


def find_peaks(freq: pd.DataFrame) -> pd.DataFrame:
    """For each term, find the time bin with the highest frequency."""
    peaks = []
    for col in freq.columns:
        series = freq[col].dropna()
        if series.sum() == 0:
            continue
        peak_bin = series.idxmax()
        peaks.append({
            "term": col,
            "peak_bin": int(peak_bin),
            "peak_rate_per_1k": round(series.max(), 2),
            "total_mentions": int(series.sum()),
        })
    return pd.DataFrame(peaks).sort_values("peak_bin")


def plot_small_multiples(freq: pd.DataFrame, out_path: Path) -> None:
    """Small-multiples grid: one panel per term, sorted by peak year."""
    # Filter to terms with enough data
    totals = freq.sum()
    keep = totals[totals >= MIN_TOTAL_COUNT / 1000 * 50].index  # rough filter
    freq = freq[keep]

    # Sort columns by peak year
    peak_years = freq.idxmax()
    sorted_terms = peak_years.sort_values().index.tolist()
    freq = freq[sorted_terms]

    n_terms = len(sorted_terms)
    if n_terms == 0:
        print("  no terms meet threshold for small-multiples plot")
        return

    ncols = 6
    nrows = (n_terms + ncols - 1) // ncols

    fig, axes = plt.subplots(nrows, ncols, figsize=(18, nrows * 2.2),
                              sharex=True, sharey=False)
    axes = axes.flatten()

    bins = freq.index.values

    for i, term in enumerate(sorted_terms):
        ax = axes[i]
        vals = freq[term].values
        ax.fill_between(bins, vals, alpha=0.4, color="#4878CF")
        ax.plot(bins, vals, linewidth=1.2, color="#4878CF")
        ax.set_title(term, fontsize=9, fontweight="bold")
        ax.set_xlim(bins.min(), bins.max())
        ax.tick_params(labelsize=7)
        # Only show y-axis label on leftmost
        if i % ncols != 0:
            ax.set_yticklabels([])

    # Hide unused axes
    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)

    fig.suptitle("UFO vocabulary frequency over time (per 1,000 reports)",
                 fontsize=14, fontweight="bold", y=1.02)
    fig.supxlabel("Year", fontsize=11)
    fig.supylabel("Mentions per 1,000 reports", fontsize=11)
    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {out_path}")


def plot_top_terms(freq: pd.DataFrame, out_path: Path, n: int = 20) -> None:
    """Bar chart of the top N terms by their peak frequency."""
    peak_rates = freq.max().sort_values(ascending=True)
    top = peak_rates.tail(n)

    fig, ax = plt.subplots(figsize=(10, 8))
    ax.barh(range(len(top)), top.values, color="#4878CF", alpha=0.8)
    ax.set_yticks(range(len(top)))
    ax.set_yticklabels(top.index, fontsize=10)
    ax.set_xlabel("Peak frequency (per 1,000 reports)", fontsize=11)
    ax.set_title(f"Top {n} UFO terms by peak frequency", fontsize=13, fontweight="bold")
    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {out_path}")


def plot_era_heatmap(freq: pd.DataFrame, out_path: Path) -> None:
    """Heatmap showing term intensity across time bins. Terms ordered by
    peak year so cultural eras emerge visually."""
    # Filter to meaningful terms
    totals = freq.sum()
    keep = totals[totals >= MIN_TOTAL_COUNT / 1000 * 50].index
    freq = freq[keep]

    # Order by peak year
    peak_years = freq.idxmax()
    sorted_terms = peak_years.sort_values().index.tolist()

    # Normalize each term to 0-1 (its own max) so the heatmap shows
    # relative rise/fall rather than absolute frequency
    normed = freq[sorted_terms].copy()
    for col in normed.columns:
        mx = normed[col].max()
        if mx > 0:
            normed[col] = normed[col] / mx

    fig, ax = plt.subplots(figsize=(14, max(8, len(sorted_terms) * 0.35)))
    sns.heatmap(
        normed.T, ax=ax, cmap="YlOrRd", linewidths=0.5,
        xticklabels=[str(int(x)) for x in normed.index],
        yticklabels=sorted_terms,
        cbar_kws={"label": "Relative intensity (0 = absent, 1 = peak)"},
    )
    ax.set_xlabel("Year (5-year bins)", fontsize=11)
    ax.set_ylabel("")
    ax.set_title("UFO vocabulary: era signatures",
                 fontsize=13, fontweight="bold")
    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {out_path}")


def main():
    if not IN_PATH.exists():
        sys.exit(f"Input not found: {IN_PATH}\nRun 02_clean.py first.")

    print(f"Reading {IN_PATH}...")
    df = pd.read_parquet(IN_PATH)
    print(f"  {len(df):,} narratives, years {df['event_year'].min()}-{df['event_year'].max()}")

    # Filter to years with enough data for meaningful rates
    # (pre-1940 has <20 reports per 5-year bin)
    df = df[df["event_year"] >= 1940].copy()
    print(f"  filtered to 1940+: {len(df):,} narratives")

    print("Counting vocabulary terms...")
    term_hits = count_terms(df)
    hit_counts = term_hits.sum().sort_values(ascending=False)
    print(f"  top 10 terms by total count:")
    for term, count in hit_counts.head(10).items():
        print(f"    {term:25s} {count:>7,}")

    print("Computing temporal frequencies...")
    freq = compute_frequencies(df, term_hits)
    freq = merge_duplicate_terms(freq)

    # Drop terms with zero total
    freq = freq.loc[:, freq.sum() > 0]

    CHART_DIR.mkdir(parents=True, exist_ok=True)
    TABLE_DIR.mkdir(parents=True, exist_ok=True)

    # Save tables
    freq_out = TABLE_DIR / "vocab_temporal.csv"
    freq.to_csv(freq_out)
    print(f"  wrote {freq_out}")

    peaks = find_peaks(freq)
    peaks_out = TABLE_DIR / "vocab_peaks.csv"
    peaks.to_csv(peaks_out, index=False)
    print(f"  wrote {peaks_out}")

    print("\nPeak periods:")
    for _, row in peaks.iterrows():
        print(f"  {row['term']:25s}  peak {int(row['peak_bin'])}s  "
              f"({row['peak_rate_per_1k']:.1f}/1k)")

    # Charts
    print("\nGenerating charts...")
    plot_small_multiples(freq, CHART_DIR / "vocab_over_time.png")
    plot_top_terms(freq, CHART_DIR / "vocab_top_terms.png")
    plot_era_heatmap(freq, CHART_DIR / "vocab_era_signature.png")

    print("\nDone.")


if __name__ == "__main__":
    main()
