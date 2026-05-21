# One Hundred Years of UFO Witness Reports as a Language Corpus

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![Tests](https://img.shields.io/badge/Tests-55%20passing-brightgreen.svg)](tests/)
[![Dashboard](https://img.shields.io/badge/Dashboard-onehundredyears.report-orange.svg)](https://onehundredyears.report)

A corpus-linguistics analysis of **111,961** NUFORC witness narratives spanning **1905–2023**. We treat the archive as a sociolinguistic corpus and apply computational text analysis to surface statistical structure that is interpretable regardless of one's beliefs about the underlying phenomena.

**[Live Dashboard](https://onehundredyears.report)** | **[Read the Paper (PDF)](https://onehundredyears.report/paper.pdf)** | **[GitHub Repo](https://github.com/doctorbrownphd/uap-corpus)**

---

## Key Findings

1. **Vocabulary tracks culture.** "Flying saucer" peaks in the 1950s, "triangle" dominates the 1990s, "tic-tac" appears only after 2017. Witness language precisely tracks cultural availability of descriptive terms.

2. **Independent witnesses converge.** 4,227 same-night clusters found — groups of witnesses in different states who filed semantically similar reports on the same evening without coordination. The algorithm surfaces the Phoenix Lights, Trident missile test, and Starlink trains with no prior knowledge.

3. **30 narrative archetypes emerge.** UMAP + HDBSCAN discovers recurring narrative patterns: the black triangle, the orange orb, the sound-only encounter, the animal-reaction report. Prosaic archetypes (meteors, drones, launches) separate cleanly from non-prosaic ones.

4. **10/10 validation.** All 10 reference events — from the Phoenix Lights to the Leonid meteor shower — are surfaced by at least 2 of 4 independent detection methods.

## Quick Start

```bash
# Clone and set up
git clone https://github.com/doctorbrownphd/uap-corpus.git
cd uap-corpus
make venv && source .venv/bin/activate
make install

# Get data (use the HuggingFace mirror — no scraping needed)
pip install huggingface_hub
python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download(repo_id='kcimc/NUFORC', filename='nuforc_str.csv',
                repo_type='dataset', local_dir='data/raw')
"

# Run the full pipeline
make acquire FILE=data/raw/nuforc_str.csv
make pipeline    # clean + geocode + embed
make analysis    # scripts 04-10 (vocab, clusters, archetypes, flaps, signatures, validation)

# Or run everything at once
make all
```

## Pipeline

A 10-stage NLP pipeline, fully idempotent and reproducible:

```
00_scrape         → data/raw/nuforc_index.csv + nuforc_reports.jsonl  (optional)
01_acquire        → data/raw/nuforc.csv
02_clean          → data/interim/nuforc_clean.parquet
02a_geocode       → updates nuforc_clean.parquet with lat/lon
03_embed          → data/embeddings/nuforc_embeddings.parquet (384-dim)
04_temporal_vocab  → outputs/charts/vocab_era_signature.png + tables
05_same_night      → data/derived/clusters_same_night.parquet
06_archetypes      → data/derived/archetypes.parquet (UMAP + HDBSCAN)
07_flaps           → data/derived/flaps.parquet
08_signatures      → data/derived/signature_phrases.parquet
09_validate        → outputs/tables/known_event_validation.csv (10/10)
10_pursue_cross    → outputs/tables/pursue_nuforc_overlaps.csv (optional)
```

## Interactive Dashboard

The dashboard at [onehundredyears.report](https://onehundredyears.report) provides:

- **Overview** — corpus stats, reports/year timeline with cultural-era overlays
- **Era Vocabulary** — interactive heatmap of 55 terms across 5-year bins
- **Geography & Flaps** — US state choropleth + flap detection catalog
- **Archetypes** — UMAP scatter of 30 narrative clusters
- **Same-Night Clusters** — explore multi-state events with state highlight maps
- **Validation** — detection matrix for 10 reference events
- **Narratives** — browse sample reports filtered by shape and archetype

Dark/light theme toggle available via the gear icon.

## Dashboards

Two dashboards are included:

- **`site/`** — Static React dashboard (deployed to onehundredyears.report). No build step; uses Babel-in-browser transpilation. Serves from any static host.
- **`dashboard.py`** — Streamlit dashboard reading directly from pipeline parquet files. Run with `streamlit run dashboard.py`.

## Project Layout

```
.
├── scripts/             pipeline stages (00-10) + common.py shared module
├── site/                static dashboard (React + custom CSS)
├── dashboard.py         Streamlit dashboard (reads parquet files)
├── tests/               55 pytest tests
├── writeup/             paper draft + PDF build script
├── data/
│   ├── raw/             source data (gitignored except PROVENANCE.md)
│   ├── interim/         cleaned parquet
│   ├── embeddings/      sentence-transformer vectors
│   └── derived/         clusters, archetypes, flaps
├── outputs/             charts and tables
├── Makefile             all pipeline + analysis targets
├── requirements.txt     Python dependencies
└── pyproject.toml       project metadata + tool config
```

## Data

- **Primary:** NUFORC public databank, accessed via the `kcimc/NUFORC` HuggingFace mirror (148K reports, Jan 2024 scrape) or the polite scraper in `scripts/00_scrape.py`.
- **Secondary (optional):** May 2026 Pentagon PURSUE Release 01 via `DenisSergeevitch/UFO-USA` on GitHub.

The underlying narratives are not redistributed. See `data/raw/PROVENANCE.md` for sourcing details.

## Tests

```bash
make test    # runs 55 tests covering pipeline, scraper, and data ingestion
```

## Acknowledgments

Data sourced from the National UFO Reporting Center (nuforc.org), used with research permission.

## License

MIT. See [LICENSE](LICENSE).

The license applies to the analysis code and pipeline. The underlying NUFORC witness narratives are not redistributed and remain the property of NUFORC.
