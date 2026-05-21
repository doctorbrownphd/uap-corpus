.PHONY: help venv install scrape scrape-smoke acquire clean geocode embed pipeline \
       vocab same-night archetypes flaps signatures validate pursue-cross \
       analysis all test profile report clean-data fresh

# Detect python; prefer venv if present
PYTHON := $(shell test -f .venv/bin/python && echo .venv/bin/python || echo python3)

help:
	@echo "UAP Corpus -- Make targets"
	@echo ""
	@echo "  Setup"
	@echo "    make venv               create .venv"
	@echo "    make install            pip install requirements into venv"
	@echo ""
	@echo "  Data acquisition"
	@echo "    make scrape-smoke CONTACT=you@example.com   pull 50 reports as a test"
	@echo "    make scrape CONTACT=you@example.com         pull full corpus (resumable)"
	@echo "    make acquire FILE=...                       normalize a raw CSV or JSONL"
	@echo ""
	@echo "  Pipeline (data prep)"
	@echo "    make clean              run cleaning script"
	@echo "    make geocode            geocode city+state to lat/lon"
	@echo "    make embed              run embedding script"
	@echo "    make pipeline           clean + geocode + embed end to end"
	@echo ""
	@echo "  Analysis (scripts 04-10)"
	@echo "    make vocab              temporal vocabulary analysis"
	@echo "    make same-night         same-night clustering"
	@echo "    make archetypes         narrative archetype discovery"
	@echo "    make flaps              flap detection"
	@echo "    make signatures         signature phrase extraction"
	@echo "    make validate           validate against known events"
	@echo "    make pursue-cross       PURSUE cross-reference (optional)"
	@echo "    make analysis           run all analysis scripts (04-10)"
	@echo "    make all                pipeline + analysis end to end"
	@echo ""
	@echo "  Inspection"
	@echo "    make profile            print summary stats on the cleaned dataset"
	@echo "    make report             cat the cleaning report"
	@echo ""
	@echo "  Maintenance"
	@echo "    make test               run pytest"
	@echo "    make clean-data         remove interim and embedding outputs"
	@echo "    make fresh              clean-data then rerun pipeline"

venv:
	python3 -m venv .venv
	@echo "Activate with: source .venv/bin/activate"

install:
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r requirements.txt

CONTACT ?=
FILE ?= data/raw/nuforc_reports.jsonl

scrape-smoke:
	@if [ -z "$(CONTACT)" ]; then echo "Set CONTACT=your@email.com"; exit 1; fi
	$(PYTHON) scripts/00_scrape.py --contact $(CONTACT) --max 50

scrape:
	@if [ -z "$(CONTACT)" ]; then echo "Set CONTACT=your@email.com"; exit 1; fi
	$(PYTHON) scripts/00_scrape.py --contact $(CONTACT) --resume

acquire:
	$(PYTHON) scripts/01_acquire.py --input $(FILE)

clean:
	$(PYTHON) scripts/02_clean.py

geocode:
	$(PYTHON) scripts/02a_geocode.py

embed:
	$(PYTHON) scripts/03_embed.py

embed-force:
	$(PYTHON) scripts/03_embed.py --force

pipeline: clean geocode embed

vocab:
	$(PYTHON) scripts/04_temporal_vocab.py

same-night:
	$(PYTHON) scripts/05_same_night.py

archetypes:
	$(PYTHON) scripts/06_archetypes.py

flaps:
	$(PYTHON) scripts/07_flaps.py

signatures:
	$(PYTHON) scripts/08_signatures.py

validate:
	$(PYTHON) scripts/09_validate.py

pursue-cross:
	$(PYTHON) scripts/10_pursue_cross.py

analysis: vocab same-night archetypes flaps signatures validate

all: pipeline analysis

profile:
	@$(PYTHON) -c "import pandas as pd; df = pd.read_parquet('data/interim/nuforc_clean.parquet'); print(f'Rows: {len(df):,}'); print(f'Date range: {df[\"event_dt\"].min()} to {df[\"event_dt\"].max()}'); print(f'States: {df[\"state\"].nunique()}'); print(f'Shapes: {df[\"shape_norm\"].nunique()}'); print(); print('Top 10 shapes:'); print(df['shape_norm'].value_counts().head(10).to_string()); print(); print('Top 10 states:'); print(df['state'].value_counts().head(10).to_string())"

report:
	@cat data/interim/cleaning_report.txt

test:
	$(PYTHON) -m pytest tests/ -v

clean-data:
	rm -f data/interim/*.parquet data/interim/*.csv data/interim/*.txt
	rm -f data/embeddings/*.parquet
	rm -f data/derived/*

fresh: clean-data pipeline
