"""
07_flaps.py

Detects UFO "flaps" — periods of anomalously high reporting activity in
a geographic region. Classic examples: 1952 Washington DC wave, 1965
northeast blackout sightings, 1997 Phoenix Lights, 2008 Stephenville TX.

Method:
  1. Compute a baseline reporting rate per state per year.
  2. Slide a window (weekly and monthly) across each state's time series
     to find periods where the rate exceeds the baseline by a threshold.
  3. Merge overlapping detections into discrete "flap" events.
  4. Score each flap by: intensity (peak / baseline ratio), duration,
     geographic spread (does it spill into neighboring states?), and
     narrative coherence (do the reports sound similar?).
  5. Compute half-life: how quickly does reporting decay after the peak?

Outputs:
  data/derived/flaps.parquet                  all detected flaps
  outputs/tables/flaps_catalog.csv            catalog of major flaps
  outputs/charts/flaps_national_timeline.png  national reporting rate + flaps
  outputs/charts/flaps_top_events.png         detail view of top flaps
"""

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CLEAN_PATH = ROOT / "data" / "interim" / "nuforc_clean.parquet"
EMBED_PATH = ROOT / "data" / "embeddings" / "nuforc_embeddings.parquet"
DERIVED_DIR = ROOT / "data" / "derived"
CHART_DIR = ROOT / "outputs" / "charts"
TABLE_DIR = ROOT / "outputs" / "tables"

# Detection parameters
MIN_YEAR = 1990          # before this, data is too sparse for rate analysis
WEEKLY_THRESHOLD = 3.0   # a week must be 3x the state's annual baseline
MONTHLY_THRESHOLD = 2.5  # monthly smoothing, lower threshold
MIN_REPORTS_IN_FLAP = 8  # minimum reports to qualify as a flap
MERGE_GAP_DAYS = 14      # merge detections within this gap


def load_data() -> tuple[pd.DataFrame, dict[str, np.ndarray]]:
    df = pd.read_parquet(CLEAN_PATH)
    df = df[df["event_year"] >= MIN_YEAR].copy()
    df["event_date"] = pd.to_datetime(df["event_date"])
    print(f"Loaded {len(df):,} reports ({MIN_YEAR}-{df['event_year'].max()})")

    # Embeddings for coherence scoring
    emb_df = pd.read_parquet(EMBED_PATH)
    emb_lookup = {}
    for _, row in emb_df.iterrows():
        emb_lookup[row["source_id"]] = np.array(row["embedding"], dtype=np.float32)
    return df, emb_lookup


def compute_baselines(df: pd.DataFrame) -> pd.DataFrame:
    """Compute annual reporting rate per state (reports per week)."""
    # Reports per state per year
    state_year = df.groupby(["state", "event_year"]).size().reset_index(name="annual_count")
    state_year["weekly_baseline"] = state_year["annual_count"] / 52.0
    return state_year


def detect_flaps_weekly(df: pd.DataFrame, baselines: pd.DataFrame) -> list[dict]:
    """Slide a weekly window across each state's time series.
    Flag weeks that exceed the threshold * baseline."""
    detections = []

    states = df["state"].unique()
    for state in states:
        sdf = df[df["state"] == state].copy()
        if len(sdf) < 20:
            continue

        # Weekly counts
        sdf = sdf.set_index("event_date")
        weekly = sdf.resample("W").size()

        for week_end, count in weekly.items():
            if count < 3:
                continue
            year = week_end.year
            bl_row = baselines[
                (baselines["state"] == state) & (baselines["event_year"] == year)
            ]
            if bl_row.empty:
                continue
            baseline = bl_row["weekly_baseline"].iloc[0]
            if baseline < 0.5:
                continue  # too sparse for meaningful detection

            ratio = count / baseline
            if ratio >= WEEKLY_THRESHOLD:
                week_start = week_end - pd.Timedelta(days=6)
                detections.append({
                    "state": state,
                    "start": week_start,
                    "end": week_end,
                    "count": int(count),
                    "baseline": round(baseline, 2),
                    "ratio": round(ratio, 1),
                })

    return detections


def merge_detections(detections: list[dict]) -> list[dict]:
    """Merge overlapping or nearby detections in the same state into
    discrete flap events."""
    if not detections:
        return []

    # Sort by state, then start date
    detections.sort(key=lambda d: (d["state"], d["start"]))

    merged = []
    current = detections[0].copy()

    for det in detections[1:]:
        if (det["state"] == current["state"] and
                det["start"] <= current["end"] + pd.Timedelta(days=MERGE_GAP_DAYS)):
            # Extend the current flap
            current["end"] = max(current["end"], det["end"])
            current["count"] += det["count"]
            current["ratio"] = max(current["ratio"], det["ratio"])
        else:
            merged.append(current)
            current = det.copy()
    merged.append(current)

    # Filter by minimum size
    return [m for m in merged if m["count"] >= MIN_REPORTS_IN_FLAP]


def enrich_flaps(flaps: list[dict], df: pd.DataFrame,
                  emb_lookup: dict[str, np.ndarray]) -> list[dict]:
    """Add duration, narrative coherence, top shapes, and half-life to each flap."""
    from sklearn.metrics.pairwise import cosine_similarity

    enriched = []
    for flap in flaps:
        mask = (
            (df["state"] == flap["state"]) &
            (df["event_date"] >= flap["start"]) &
            (df["event_date"] <= flap["end"])
        )
        fdf = df[mask]

        if len(fdf) == 0:
            continue

        duration_days = (flap["end"] - flap["start"]).days + 1

        # Top shapes
        shapes = fdf["shape_norm"].value_counts()
        top_shape = shapes.index[0] if len(shapes) > 0 else ""
        top_3 = ", ".join(shapes.head(3).index.tolist())

        # Cities involved
        n_cities = fdf["city"].nunique()

        # Narrative coherence (sample if large)
        sids = fdf["source_id"].tolist()
        vecs = [emb_lookup[sid] for sid in sids if sid in emb_lookup]
        coherence = 0.0
        if len(vecs) >= 2:
            vecs = np.array(vecs[:200])  # cap for speed
            sim = cosine_similarity(vecs)
            triu = np.triu_indices(len(vecs), k=1)
            coherence = float(sim[triu].mean())

        # Half-life: days from peak to half the peak daily rate
        daily = fdf.groupby("event_date").size()
        if len(daily) >= 3:
            peak_date = daily.idxmax()
            peak_rate = daily.max()
            half_target = peak_rate / 2.0
            post_peak = daily[daily.index > peak_date]
            half_life = None
            for date, rate in post_peak.items():
                if rate <= half_target:
                    half_life = (date - peak_date).days
                    break
        else:
            peak_date = fdf["event_date"].iloc[0]
            half_life = None

        enriched.append({
            "state": flap["state"],
            "start": flap["start"],
            "end": flap["end"],
            "peak_date": peak_date,
            "n_reports": len(fdf),
            "duration_days": duration_days,
            "peak_ratio": flap["ratio"],
            "baseline_weekly": flap["baseline"],
            "n_cities": n_cities,
            "top_shape": top_shape,
            "top_3_shapes": top_3,
            "coherence": round(coherence, 3),
            "half_life_days": half_life,
        })

    return enriched


def find_multi_state_flaps(flaps: list[dict]) -> list[dict]:
    """Identify flaps that overlap temporally across multiple states,
    suggesting a regional or national event."""
    for i, f1 in enumerate(flaps):
        concurrent = []
        for j, f2 in enumerate(flaps):
            if i == j:
                continue
            # Overlapping time windows
            if f1["start"] <= f2["end"] and f2["start"] <= f1["end"]:
                concurrent.append(f2["state"])
        f1["concurrent_states"] = sorted(set(concurrent))
        f1["n_concurrent_states"] = len(set(concurrent))
    return flaps


def plot_national_timeline(df: pd.DataFrame, flaps: list[dict],
                            out_path: Path) -> None:
    """National weekly reporting rate with top flaps annotated."""
    df = df.set_index("event_date")
    weekly = df.resample("W").size()

    fig, ax = plt.subplots(figsize=(16, 5))
    ax.fill_between(weekly.index, weekly.values, alpha=0.4, color="#4878CF")
    ax.plot(weekly.index, weekly.values, linewidth=0.5, color="#4878CF")

    # Annotate the top 15 flaps by report count
    top = sorted(flaps, key=lambda f: f["n_reports"], reverse=True)[:15]
    for f in top:
        ax.axvspan(f["start"], f["end"], alpha=0.15, color="red")
        label = f"{f['state']} ({f['n_reports']})"
        ax.annotate(label, xy=(f["peak_date"], 0), xytext=(f["peak_date"], -30),
                    fontsize=6, rotation=45, ha="center",
                    annotation_clip=False, color="red")

    ax.set_xlabel("Date", fontsize=11)
    ax.set_ylabel("Reports per week (national)", fontsize=11)
    ax.set_title("NUFORC national reporting rate with detected flaps",
                 fontsize=13, fontweight="bold")
    ax.xaxis.set_major_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {out_path}")


def plot_top_flaps(df: pd.DataFrame, flaps: list[dict],
                    out_path: Path, n: int = 12) -> None:
    """Small-multiples: daily report count for the top N flaps."""
    top = sorted(flaps, key=lambda f: f["n_reports"], reverse=True)[:n]

    ncols = 4
    nrows = (n + ncols - 1) // ncols
    fig, axes = plt.subplots(nrows, ncols, figsize=(16, nrows * 3))
    axes = axes.flatten()

    for i, flap in enumerate(top):
        ax = axes[i]
        # Get daily counts for this state in a window around the flap
        margin = pd.Timedelta(days=14)
        mask = (
            (df["state"] == flap["state"]) &
            (df["event_date"] >= flap["start"] - margin) &
            (df["event_date"] <= flap["end"] + margin)
        )
        fdf = df[mask].set_index("event_date")
        daily = fdf.resample("D").size()

        ax.bar(daily.index, daily.values, color="#4878CF", alpha=0.7, width=1)
        ax.axvspan(flap["start"], flap["end"], alpha=0.15, color="red")

        title = (f"{flap['state']} — {flap['start'].strftime('%b %Y')}\n"
                 f"{flap['n_reports']} reports, {flap['duration_days']}d, "
                 f"{flap['top_shape']}")
        ax.set_title(title, fontsize=8, fontweight="bold")
        ax.tick_params(labelsize=7)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d"))

    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)

    fig.suptitle("Top same-state flaps: daily report counts",
                 fontsize=13, fontweight="bold", y=1.02)
    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {out_path}")


def main():
    for path in (CLEAN_PATH, EMBED_PATH):
        if not path.exists():
            sys.exit(f"Input not found: {path}")

    df, emb_lookup = load_data()
    baselines = compute_baselines(df)

    print(f"\nDetecting weekly flaps (threshold={WEEKLY_THRESHOLD}x baseline)...")
    detections = detect_flaps_weekly(df, baselines)
    print(f"  raw detections: {len(detections):,}")

    flaps = merge_detections(detections)
    print(f"  merged into {len(flaps):,} discrete flaps (≥{MIN_REPORTS_IN_FLAP} reports)")

    print("Enriching with coherence, shapes, half-life...")
    flaps = enrich_flaps(flaps, df, emb_lookup)
    flaps = find_multi_state_flaps(flaps)

    # Sort by report count
    flaps.sort(key=lambda f: f["n_reports"], reverse=True)

    # Assign IDs
    for i, f in enumerate(flaps):
        f["flap_id"] = i

    # --- Outputs ---
    DERIVED_DIR.mkdir(parents=True, exist_ok=True)
    TABLE_DIR.mkdir(parents=True, exist_ok=True)
    CHART_DIR.mkdir(parents=True, exist_ok=True)

    # Save full catalog
    flap_df = pd.DataFrame(flaps)
    flap_df.to_parquet(DERIVED_DIR / "flaps.parquet", index=False)
    print(f"\nWrote {DERIVED_DIR / 'flaps.parquet'} ({len(flaps):,} flaps)")

    # CSV catalog (top 100)
    catalog_cols = [
        "flap_id", "state", "start", "end", "peak_date", "n_reports",
        "duration_days", "peak_ratio", "n_cities", "top_3_shapes",
        "coherence", "half_life_days", "n_concurrent_states",
    ]
    cat = flap_df[catalog_cols].head(100)
    cat.to_csv(TABLE_DIR / "flaps_catalog.csv", index=False)
    print(f"Wrote {TABLE_DIR / 'flaps_catalog.csv'}")

    # Print top 20
    print(f"\nTop 20 flaps:")
    print("-" * 100)
    for f in flaps[:20]:
        concurrent = f", +{f['n_concurrent_states']} states" if f["n_concurrent_states"] else ""
        hl = f", hl={f['half_life_days']}d" if f["half_life_days"] else ""
        print(f"  #{f['flap_id']:3d}  {f['state']:2s}  "
              f"{f['start'].strftime('%Y-%m-%d')} to {f['end'].strftime('%Y-%m-%d')}  "
              f"{f['n_reports']:4d} reports  {f['duration_days']:3d}d  "
              f"ratio={f['peak_ratio']:.1f}x  "
              f"shape={f['top_shape']:10s}  "
              f"coh={f['coherence']:.2f}{hl}{concurrent}")

    # Charts
    print(f"\nGenerating charts...")
    plot_national_timeline(df.copy(), flaps, CHART_DIR / "flaps_national_timeline.png")
    plot_top_flaps(df.copy(), flaps, CHART_DIR / "flaps_top_events.png")

    # Summary stats
    print(f"\nSummary:")
    print(f"  {len(flaps):,} flaps detected")
    print(f"  Median duration: {np.median([f['duration_days'] for f in flaps]):.0f} days")
    hl_vals = [f["half_life_days"] for f in flaps if f["half_life_days"] is not None]
    if hl_vals:
        print(f"  Median half-life: {np.median(hl_vals):.0f} days")
    multi = sum(1 for f in flaps if f["n_concurrent_states"] > 0)
    print(f"  Multi-state concurrent: {multi} ({multi/len(flaps)*100:.0f}%)")


if __name__ == "__main__":
    main()
