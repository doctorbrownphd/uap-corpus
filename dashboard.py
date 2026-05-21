"""
UAP Corpus Interactive Dashboard

Companion to "One Hundred Years of UFO Witness Reports as a Language Corpus"

Run:  streamlit run dashboard.py
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

ROOT = Path(__file__).resolve().parent

st.set_page_config(
    page_title="UAP Corpus Explorer",
    page_icon="🔭",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# Data loading (cached)
# ---------------------------------------------------------------------------

@st.cache_data(ttl=3600)
def load_clean():
    return pd.read_parquet(ROOT / "data/interim/nuforc_clean.parquet")

@st.cache_data(ttl=3600)
def load_archetypes():
    path = ROOT / "data/derived/archetypes.parquet"
    if path.exists():
        return pd.read_parquet(path)
    return None

@st.cache_data(ttl=3600)
def load_clusters():
    path = ROOT / "data/derived/clusters_same_night.parquet"
    if path.exists():
        return pd.read_parquet(path)
    return None

@st.cache_data(ttl=3600)
def load_flaps():
    path = ROOT / "data/derived/flaps.parquet"
    if path.exists():
        return pd.read_parquet(path)
    return None

@st.cache_data(ttl=3600)
def load_vocab():
    path = ROOT / "outputs/tables/vocab_temporal.csv"
    if path.exists():
        return pd.read_csv(path, index_col=0)
    return None

@st.cache_data(ttl=3600)
def load_peaks():
    path = ROOT / "outputs/tables/vocab_peaks.csv"
    if path.exists():
        return pd.read_csv(path)
    return None

@st.cache_data(ttl=3600)
def load_validation():
    path = ROOT / "outputs/tables/known_event_validation.csv"
    if path.exists():
        return pd.read_csv(path)
    return None

@st.cache_data(ttl=3600)
def load_top_clusters():
    path = ROOT / "outputs/tables/same_night_top_clusters.csv"
    if path.exists():
        return pd.read_csv(path)
    return None

@st.cache_data(ttl=3600)
def load_archetype_profiles():
    path = ROOT / "outputs/tables/archetype_profiles.csv"
    if path.exists():
        return pd.read_csv(path)
    return None

@st.cache_data(ttl=3600)
def load_signatures():
    path = ROOT / "outputs/tables/known_event_signatures.csv"
    if path.exists():
        return pd.read_csv(path)
    return None


# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------

st.sidebar.title("🔭 UAP Corpus")
st.sidebar.markdown(
    "*One Hundred Years of UFO Witness Reports as a Language Corpus*"
)

page = st.sidebar.radio("Navigate", [
    "Overview",
    "Corpus Explorer",
    "Vocabulary Over Time",
    "Same-Night Clusters",
    "Flaps Map",
    "Narrative Archetypes",
    "Signature Phrases",
    "Validation",
])

df = load_clean()


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

if page == "Overview":
    st.title("UAP Corpus Analysis")
    st.markdown("""
    A corpus-linguistics analysis of **{:,}** NUFORC witness reports
    spanning **{}–{}**, treating the archive as a structured
    sociolinguistic corpus.
    """.format(len(df), df["event_year"].min(), df["event_year"].max()))

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Reports", f"{len(df):,}")
    col2.metric("States", df["state"].nunique())
    col3.metric("Year span", f"{df['event_year'].min()}–{df['event_year'].max()}")
    col4.metric("Shapes", df["shape_norm"].nunique())

    st.subheader("Reports per year")
    yr = df.groupby("event_year").size().reset_index(name="count")
    fig = px.area(yr, x="event_year", y="count",
                  labels={"event_year": "Year", "count": "Reports"},
                  color_discrete_sequence=["#4878CF"])
    fig.update_layout(height=350, margin=dict(t=20, b=40))
    st.plotly_chart(fig, use_container_width=True)

    c1, c2 = st.columns(2)

    with c1:
        st.subheader("Top 15 shapes")
        shapes = df["shape_norm"].value_counts().head(15).reset_index()
        shapes.columns = ["shape", "count"]
        fig = px.bar(shapes, x="count", y="shape", orientation="h",
                     color_discrete_sequence=["#4878CF"])
        fig.update_layout(height=400, margin=dict(t=10, l=10), yaxis=dict(autorange="reversed"))
        st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.subheader("Top 15 states")
        states = df["state"].value_counts().head(15).reset_index()
        states.columns = ["state", "count"]
        fig = px.bar(states, x="count", y="state", orientation="h",
                     color_discrete_sequence=["#E8793A"])
        fig.update_layout(height=400, margin=dict(t=10, l=10), yaxis=dict(autorange="reversed"))
        st.plotly_chart(fig, use_container_width=True)

    # Map
    if df["latitude"].notna().any():
        st.subheader("Geographic distribution")
        sample = df[df["geocode_method"] == "exact"].sample(min(10000, len(df)), random_state=42)
        fig = px.scatter_mapbox(
            sample, lat="latitude", lon="longitude",
            color="shape_norm",
            hover_data=["city", "state", "event_year", "shape_norm"],
            zoom=3, center={"lat": 39, "lon": -98},
            mapbox_style="carto-positron",
            opacity=0.4, size_max=4,
            height=500,
        )
        fig.update_layout(margin=dict(t=0, b=0, l=0, r=0))
        st.plotly_chart(fig, use_container_width=True)


elif page == "Corpus Explorer":
    st.title("Corpus Explorer")

    c1, c2, c3 = st.columns(3)
    with c1:
        year_range = st.slider("Year range",
                               int(df["event_year"].min()),
                               int(df["event_year"].max()),
                               (1990, int(df["event_year"].max())))
    with c2:
        states = st.multiselect("State", sorted(df["state"].unique()), default=[])
    with c3:
        shapes = st.multiselect("Shape", sorted(df["shape_norm"].unique()), default=[])

    search = st.text_input("Search narratives (case-insensitive)")

    mask = (df["event_year"] >= year_range[0]) & (df["event_year"] <= year_range[1])
    if states:
        mask &= df["state"].isin(states)
    if shapes:
        mask &= df["shape_norm"].isin(shapes)
    if search:
        mask &= df["narrative"].str.contains(search, case=False, na=False)

    filtered = df[mask]
    st.markdown(f"**{len(filtered):,}** reports match")

    if len(filtered) > 0:
        # Timeline
        yr = filtered.groupby("event_year").size().reset_index(name="count")
        fig = px.bar(yr, x="event_year", y="count",
                     labels={"event_year": "Year", "count": "Reports"},
                     color_discrete_sequence=["#4878CF"])
        fig.update_layout(height=250, margin=dict(t=10, b=30))
        st.plotly_chart(fig, use_container_width=True)

        # Sample narratives
        st.subheader("Sample reports")
        sample = filtered.sample(min(20, len(filtered)), random_state=42)
        for _, row in sample.iterrows():
            with st.expander(f"{row['event_date']} — {row['city']}, {row['state']} — {row['shape_norm']}"):
                st.write(row["narrative"])


elif page == "Vocabulary Over Time":
    st.title("Vocabulary Over Time")
    st.markdown("How UFO-related terms rise and fall across decades.")

    vocab = load_vocab()
    peaks = load_peaks()

    if vocab is not None:
        # Heatmap
        st.subheader("Era signature heatmap")
        # Normalize each term to 0-1
        normed = vocab.copy()
        for col in normed.columns:
            mx = normed[col].max()
            if mx > 0:
                normed[col] = normed[col] / mx

        # Sort by peak year
        peak_order = normed.idxmax().sort_values().index.tolist()
        normed = normed[peak_order]

        fig = px.imshow(
            normed.T, aspect="auto",
            labels=dict(x="Year (5-year bins)", y="Term", color="Relative intensity"),
            color_continuous_scale="YlOrRd",
            height=max(500, len(peak_order) * 18),
        )
        fig.update_layout(margin=dict(t=30, b=40))
        st.plotly_chart(fig, use_container_width=True)

        # Individual term explorer
        st.subheader("Explore a term")
        terms = list(vocab.columns)
        selected = st.selectbox("Select term", terms, index=terms.index("triangle/triangular") if "triangle/triangular" in terms else 0)
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=vocab.index, y=vocab[selected],
            fill="tozeroy", fillcolor="rgba(72,120,207,0.3)",
            line=dict(color="#4878CF", width=2),
            name=selected,
        ))
        fig.update_layout(
            xaxis_title="Year", yaxis_title="Mentions per 1,000 reports",
            title=f'"{selected}" frequency over time',
            height=350, margin=dict(t=40, b=40),
        )
        st.plotly_chart(fig, use_container_width=True)

    if peaks is not None:
        st.subheader("Peak periods")
        st.dataframe(peaks.sort_values("peak_bin"), use_container_width=True, hide_index=True)


elif page == "Same-Night Clusters":
    st.title("Same-Night Clusters")
    st.markdown(
        "Independent witnesses in different locations filing similar reports "
        "on the same night. Each cluster was found blind — no prior knowledge "
        "of known events."
    )

    top = load_top_clusters()
    clusters = load_clusters()

    if top is not None:
        st.subheader(f"Top {len(top)} clusters")
        for i, row in top.head(30).iterrows():
            label = (f"**#{row['cluster_id']}** — {row['event_date']} — "
                     f"{row['n_reports']} reports, {row['n_states']} states — "
                     f"sim={row['mean_cosine_sim']:.3f} — shape: {row['top_shape']}")
            with st.expander(label):
                st.markdown(f"**States:** {row['states']}")
                st.markdown(f"**Representative narrative:**")
                st.info(row['representative_narrative'])

                # Show on map if we have coordinates
                if clusters is not None:
                    cids = clusters[clusters["cluster_id"] == row["cluster_id"]]["source_id"]
                    cluster_reports = df[df["source_id"].isin(cids)]
                    if cluster_reports["latitude"].notna().any():
                        fig = px.scatter_mapbox(
                            cluster_reports, lat="latitude", lon="longitude",
                            hover_data=["city", "state", "narrative"],
                            zoom=3, mapbox_style="carto-positron",
                            height=300,
                        )
                        fig.update_layout(margin=dict(t=0, b=0, l=0, r=0))
                        st.plotly_chart(fig, use_container_width=True)


elif page == "Flaps Map":
    st.title("UFO Flaps")
    st.markdown(
        "Periods of anomalously high reporting in a state. "
        "Intensity = peak reporting rate / annual baseline."
    )

    flaps_df = load_flaps()
    if flaps_df is not None:
        flaps_df["start"] = pd.to_datetime(flaps_df["start"])
        flaps_df["end"] = pd.to_datetime(flaps_df["end"])
        flaps_df["year"] = flaps_df["start"].dt.year

        # Timeline
        st.subheader("National reporting rate with flaps")
        yr_national = df.groupby("event_year").size().reset_index(name="reports")
        fig = px.area(yr_national, x="event_year", y="reports",
                      color_discrete_sequence=["#4878CF"],
                      labels={"event_year": "Year", "reports": "Reports"})

        # Add top flaps as markers
        top_flaps = flaps_df.nlargest(20, "n_reports")
        fig.add_trace(go.Scatter(
            x=top_flaps["year"], y=[yr_national[yr_national["event_year"]==y]["reports"].values[0]
                                     if y in yr_national["event_year"].values else 0
                                     for y in top_flaps["year"]],
            mode="markers+text",
            marker=dict(size=10, color="red", symbol="diamond"),
            text=top_flaps["state"],
            textposition="top center",
            textfont=dict(size=9),
            name="Top flaps",
        ))
        fig.update_layout(height=350, margin=dict(t=20, b=40), showlegend=False)
        st.plotly_chart(fig, use_container_width=True)

        # Flap catalog
        st.subheader("Flap catalog")
        display_cols = [
            "flap_id", "state", "start", "end", "n_reports",
            "duration_days", "peak_ratio", "top_3_shapes",
            "coherence", "half_life_days", "n_concurrent_states",
        ]
        available = [c for c in display_cols if c in flaps_df.columns]
        st.dataframe(
            flaps_df[available].head(50),
            use_container_width=True, hide_index=True,
        )

        # Map: show flap locations
        if df["latitude"].notna().any():
            st.subheader("Flap locations")
            st.markdown("Select a flap to see its reports on the map.")
            flap_id = st.selectbox(
                "Flap",
                flaps_df.head(30)["flap_id"].tolist(),
                format_func=lambda x: f"#{x} — {flaps_df[flaps_df['flap_id']==x].iloc[0]['state']} "
                                       f"({flaps_df[flaps_df['flap_id']==x].iloc[0]['start'].strftime('%b %Y')}, "
                                       f"{flaps_df[flaps_df['flap_id']==x].iloc[0]['n_reports']} reports)"
            )
            flap = flaps_df[flaps_df["flap_id"] == flap_id].iloc[0]
            flap_start = pd.Timestamp(flap["start"]).date()
            flap_end = pd.Timestamp(flap["end"]).date()
            flap_reports = df[
                (df["event_date"] >= flap_start) &
                (df["event_date"] <= flap_end) &
                (df["state"] == flap["state"])
            ]
            if len(flap_reports) > 0 and flap_reports["latitude"].notna().any():
                fig = px.scatter_mapbox(
                    flap_reports, lat="latitude", lon="longitude",
                    hover_data=["city", "event_date", "shape_norm"],
                    color="shape_norm",
                    zoom=5, mapbox_style="carto-positron",
                    height=450,
                )
                fig.update_layout(margin=dict(t=0, b=0, l=0, r=0))
                st.plotly_chart(fig, use_container_width=True)

                st.markdown(f"**{len(flap_reports)} reports** in {flap['state']} "
                            f"from {flap['start'].strftime('%b %d')} to {flap['end'].strftime('%b %d, %Y')}")


elif page == "Narrative Archetypes":
    st.title("Narrative Archetypes")
    st.markdown(
        "UMAP + HDBSCAN discovers recurring narrative patterns in the corpus. "
        "Each archetype is a cluster of semantically similar witness descriptions."
    )

    arch_df = load_archetypes()
    profiles = load_archetype_profiles()

    if arch_df is not None and "umap_x" in arch_df.columns:
        st.subheader("UMAP projection")
        # Sample for performance
        sample = arch_df.sample(min(15000, len(arch_df)), random_state=42).copy()
        sample["label"] = sample["archetype"].apply(
            lambda x: f"A{x}" if x >= 0 else "unclustered"
        )
        fig = px.scatter(
            sample, x="umap_x", y="umap_y", color="label",
            hover_data=["city", "state", "event_year", "shape_norm"],
            opacity=0.4, height=600,
            color_discrete_sequence=px.colors.qualitative.Dark24,
        )
        fig.update_traces(marker_size=3)
        fig.update_layout(
            margin=dict(t=20, b=20),
            xaxis_title="UMAP 1", yaxis_title="UMAP 2",
            legend=dict(font=dict(size=9)),
        )
        st.plotly_chart(fig, use_container_width=True)

    if profiles is not None:
        st.subheader("Archetype profiles")
        for _, row in profiles.iterrows():
            with st.expander(
                f"**A{row['archetype_id']}** — {row['n_reports']:,} reports "
                f"({row['pct_of_corpus']}%) — {row['top_3_shapes']}"
            ):
                st.markdown(f"**Peak decade:** {row['peak_decade']}s")
                st.markdown(f"**Coherence:** {row['mean_cosine_sim']}")
                st.markdown(f"**Distinctive terms:** {row['distinctive_terms']}")
                st.markdown(f"**Representative:**")
                st.info(row["representative_narrative"])


elif page == "Signature Phrases":
    st.title("Signature Phrases")
    st.markdown(
        "Linguistic fingerprints: bigrams and trigrams that are distinctive "
        "to specific known UFO events."
    )

    sigs = load_signatures()
    if sigs is not None:
        events = sigs["event_name"].unique()
        selected = st.selectbox("Event", events)
        edf = sigs[sigs["event_name"] == selected].head(15)

        fig = px.bar(
            edf.sort_values("distinctiveness"),
            x="distinctiveness", y="phrase", orientation="h",
            color="event_rate_pct",
            color_continuous_scale="YlOrRd",
            labels={"distinctiveness": "Distinctiveness score",
                    "phrase": "", "event_rate_pct": "% of reports"},
            height=max(300, len(edf) * 30),
        )
        fig.update_layout(margin=dict(t=20, l=10), yaxis=dict(autorange="reversed"))
        st.plotly_chart(fig, use_container_width=True)

        st.markdown(f"**{edf['event_n_reports'].iloc[0]}** reports in this event")


elif page == "Validation":
    st.title("Known Event Validation")
    st.markdown(
        "The pipeline was tested against 10 known events (5 unexplained, "
        "5 prosaic). Each event was checked for detection across 4 methods."
    )

    val = load_validation()
    if val is not None:
        # Scorecard
        total = len(val)
        passed = (val["detections_out_of_4"] >= 2).sum()

        c1, c2, c3 = st.columns(3)
        c1.metric("Events tested", total)
        c2.metric("Pass (≥2/4)", f"{passed}/{total}")
        c3.metric("Pass rate", f"{passed/total*100:.0f}%")

        # Heatmap of detections
        heat_cols = ["cluster_found", "flap_found", "sig_found", "shape_matches"]
        available = [c for c in heat_cols if c in val.columns]
        heat = val.set_index("event")[available].astype(int)
        heat.columns = [c.replace("_", " ").title() for c in heat.columns]

        fig = px.imshow(
            heat, text_auto=True, aspect="auto",
            color_continuous_scale=["#f8f8f8", "#2ca02c"],
            labels=dict(x="Detection method", y="Event", color="Found"),
            height=max(300, len(val) * 35),
        )
        fig.update_layout(margin=dict(t=20, b=20))
        st.plotly_chart(fig, use_container_width=True)

        # Detail table
        st.subheader("Full results")
        st.dataframe(val, use_container_width=True, hide_index=True)


# ---------------------------------------------------------------------------
# Footer
# ---------------------------------------------------------------------------

st.sidebar.markdown("---")
st.sidebar.markdown(
    "Data: [NUFORC](https://nuforc.org) · "
    "Used with research permission from Christian Stepien, NUFORC CTO"
)
