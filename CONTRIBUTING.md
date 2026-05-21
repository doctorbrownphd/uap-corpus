# Contributing

Thanks for your interest in contributing to the UAP Corpus project.

## Setup

```bash
git clone https://github.com/doctorbrownphd/uap-corpus.git
cd uap-corpus
make venv && source .venv/bin/activate
make install
```

## Running Tests

```bash
make test
```

All 55 tests must pass before submitting a PR.

## Code Style

We use **black** for formatting and **ruff** for linting:

```bash
black scripts/ tests/ dashboard.py
ruff check scripts/ tests/ dashboard.py
```

## Pipeline

The analysis pipeline runs in order:

```
make acquire FILE=data/raw/nuforc_str.csv
make pipeline        # clean + geocode + embed
make analysis        # scripts 04-10
```

Each script is idempotent — safe to re-run.

## Adding a New Analysis Script

1. Name it `scripts/NN_name.py` (next available number)
2. Import shared constants from `scripts/common.py`
3. Add a Makefile target
4. Add tests in `tests/`
5. Write outputs to `data/derived/`, `outputs/charts/`, or `outputs/tables/`

## Data

The underlying NUFORC narratives are not redistributed. Contributors must obtain the source data independently from nuforc.org or a public mirror (e.g., `kcimc/NUFORC` on HuggingFace).

## Pull Requests

- One feature or fix per PR
- Include test coverage for new analysis logic
- Update the README if adding new pipeline stages
