# UAP Corpus Analysis

Working title: *One Hundred Years of UFO Witness Reports as a Language Corpus*

A corpus-linguistics analysis of NUFORC report narratives, with optional
cross-referencing against the May 2026 PURSUE government release where the
two overlap.

## Stance

This is not an attempt to prove or debunk anything about the underlying
phenomena. It is an attempt to treat ~80K first-person witness narratives
collected across roughly a century as a structured sociolinguistic corpus
and surface what is statistically there.

Three honest framings the analysis supports simultaneously:

1. Witness vocabulary tracks available cultural language (flying saucer,
   triangle, orb, drone, tic-tac all appear and rise at culturally
   identifiable moments).
2. Independent witnesses on the same night in nearby locations sometimes
   produce remarkably consistent narratives, and the clustering algorithm
   can surface these events without prior knowledge.
3. Whatever caused these reports, the corpus itself is a real cultural
   artifact with statistical structure worth examining.

## Quick start

### VS Code (recommended)

1. Open `uap-corpus.code-workspace` in VS Code. Accept the prompt to
   install recommended extensions (Python, Pylance, Jupyter, Data Wrangler,
   Rainbow CSV).
2. Open a terminal in VS Code (`Ctrl+` `` ` ``) then run:

   ```
   make venv && source .venv/bin/activate && make install
   ```

3. Get the data via the scraper:

   ```
   make scrape-smoke CONTACT=your@email.com   # smoke test (50 reports)
   make scrape CONTACT=your@email.com         # full pull, resumable
   ```

   Or drop a historical CSV (scrubbed.csv etc.) into `data/raw/` if you
   prefer the older mirror.

4. Hit `Ctrl+Shift+B` to run the default build task (acquire + clean + embed).
   Or `Ctrl+Shift+P` -> `Tasks: Run Task` to pick individual stages.

Tasks available:

- `pipeline: acquire` — prompts for the input CSV path
- `pipeline: clean` — runs cleaning, produces drop log
- `pipeline: embed` — runs sentence-transformer embeddings
- `pipeline: run all (clean + embed)` — default build task
- `data: profile cleaned dataset` — summary stats
- `data: show cleaning report` — opens the cleaning report
- `tests: run all` — runs pytest

### Debug configs (F5)

- Debug: 01 acquire (with input arg)
- Debug: 02 clean
- Debug: 03 embed
- Debug: 03 embed (CPU, small batch for stepping)
- Debug: current script
- Debug: pytest current file

### Terminal (alternative)

```
make venv
source .venv/bin/activate
make install
make acquire FILE=data/raw/scrubbed.csv
make pipeline    # clean + embed
make profile     # summary stats
make test        # run pytest
```

## Acknowledgments

Data sourced from the National UFO Reporting Center (nuforc.org), used
with research permission.

## Data sources

- **Primary:** NUFORC public databank (nuforc.org/databank), accessed by
  the polite scraper in `scripts/00_scrape.py` with explicit research
  permission. See `data/raw/PROVENANCE.md` for run-level provenance.
- **Secondary (PURSUE cross-reference, optional):** May 2026 Pentagon
  PURSUE Release 01, via pre-OCR'd Markdown mirror at
  `DenisSergeevitch/UFO-USA` on GitHub.

## Pipeline

```
00_scrape    -> data/raw/nuforc_index.csv + data/raw/nuforc_reports.jsonl
01_acquire   -> data/raw/nuforc.csv
02_clean     -> data/interim/nuforc_clean.parquet  (+ drops.csv, report.txt)
03_embed     -> data/embeddings/nuforc_embeddings.parquet
04_temporal_vocab  -> outputs/charts/vocab_over_time.png + table
05_same_night      -> data/derived/clusters_same_night.parquet + top clusters
06_archetypes      -> data/derived/archetypes.parquet
07_flaps           -> data/derived/flaps.parquet
08_signatures      -> data/derived/signature_phrases.parquet
09_validate        -> outputs/tables/known_event_validation.csv
10_pursue_cross    -> outputs/tables/pursue_nuforc_overlaps.csv  (optional)
```

Scripts 00-03 are implemented. 04-10 land as we work through them.

Each script is idempotent and resumes from cache where possible.

## Project layout

```
.
├── .vscode/             tasks, launch configs, settings, snippets
├── data/
│   ├── raw/             original scrapes (gitignored except PROVENANCE.md)
│   ├── interim/         cleaned outputs
│   ├── embeddings/      sentence-transformer vectors
│   └── derived/         clusters, archetypes, etc
├── scripts/             pipeline stages
├── tests/               pytest unit tests
├── notebooks/           exploratory work
├── outputs/             charts and tables for the writeup
├── writeup/             draft of the paper
├── Makefile             terminal entry point
├── pyproject.toml       pytest, black, ruff config
└── requirements.txt
```

## Reuse

This repository's analysis code is MIT-licensed. The underlying NUFORC
report data is not redistributed; anyone reproducing this work must
either request their own research permission from NUFORC or use a public
historical mirror. See `data/raw/PROVENANCE.md` for full sourcing notes
per run.
