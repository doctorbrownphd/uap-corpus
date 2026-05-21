"""
Unit tests for the scraper and the JSONL acquisition path.

Run from the project root:
    pytest tests/ -v
"""

import json
import sys
from pathlib import Path

import pandas as pd
import pytest

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))


def _load_module(filename: str):
    """Load a script by filename, stripping its main() call."""
    import importlib.util  # noqa: F401
    path = SCRIPTS_DIR / filename
    src = path.read_text().replace(
        'if __name__ == "__main__":\n    main()',
        ""
    )
    ns = {"__file__": str(path)}
    exec(src, ns)
    return ns


@pytest.fixture(scope="module")
def scrape_mod():
    return _load_module("00_scrape.py")


@pytest.fixture(scope="module")
def acquire_mod():
    return _load_module("01_acquire.py")


# ---------- Fixtures: realistic NUFORC HTML fragments ----------

INDEX_HTML = """
<html><body>
<table>
<tr>
  <th>Link</th><th>Occurred</th><th>City</th><th>State</th><th>Country</th>
  <th>Shape</th><th>Summary</th><th>Reported</th><th>Media</th><th>Explanation</th>
</tr>
<tr>
  <td><a href="https://nuforc.org/sighting/?id=111">Open</a></td>
  <td>02/02/1995 23:00</td>
  <td>Shady Grove</td>
  <td>OR</td>
  <td>USA</td>
  <td></td>
  <td>Man and wife witness bright moving light over ridge.</td>
  <td>02/03/1995</td>
  <td></td>
  <td></td>
</tr>
<tr>
  <td><a href="https://nuforc.org/sighting/?id=114">Open !</a></td>
  <td>02/02/1995 20:10</td>
  <td>Traverse City</td>
  <td>MI</td>
  <td>USA</td>
  <td>Disc</td>
  <td>4 children report seeing disc above them.</td>
  <td>02/03/1995</td>
  <td>Y</td>
  <td></td>
</tr>
<tr>
  <td><a href="https://nuforc.org/sighting/?id=149">Open</a></td>
  <td>02/03/1995 21:30</td>
  <td>Romulus</td>
  <td>MI</td>
  <td>USA</td>
  <td></td>
  <td>Two young males rept. seeing WW II style bomber fly overhead.</td>
  <td>02/08/1995</td>
  <td></td>
  <td>Aircraft</td>
</tr>
</table>
</body></html>
"""


DETAIL_HTML = """
<html><body>
<main>
<h1>UFO Sighting Report</h1>
<p>Occurred: 02/02/1995 23:00</p>
<p>Reported: 02/03/1995</p>
<p>Posted: 02/04/1995</p>
<p>Location: Shady Grove, OR, USA</p>
<p>Shape: Light</p>
<p>Duration: 5 minutes</p>
<p>Characteristics: Lights on object</p>
<p>Man and wife were standing in their backyard around 11pm. They both
observed a very bright, moving light over the ridge to their southwest.
The object had flashing green and red lights and made no sound. It moved
slowly across the sky for several minutes before disappearing behind the
trees.</p>
</main>
</body></html>
"""


# ---------- Tests: index parser ----------

class TestIndexParser:
    """parse_index pulls IDs and metadata from the all-reports table."""

    def test_extracts_all_rows(self, scrape_mod):
        import logging
        log = logging.getLogger("test")
        recs = scrape_mod["parse_index"](INDEX_HTML, log)
        assert len(recs) == 3

    def test_extracts_sighting_id_from_href(self, scrape_mod):
        import logging
        log = logging.getLogger("test")
        recs = scrape_mod["parse_index"](INDEX_HTML, log)
        ids = [r["sighting_id"] for r in recs]
        assert ids == [111, 114, 149]

    def test_tier1_marker_detected(self, scrape_mod):
        """The 'Open !' link text marks Tier 1 reports."""
        import logging
        log = logging.getLogger("test")
        recs = scrape_mod["parse_index"](INDEX_HTML, log)
        tier1_flags = {r["sighting_id"]: r["is_tier1"] for r in recs}
        assert tier1_flags[111] is False
        assert tier1_flags[114] is True   # the "Open !" one
        assert tier1_flags[149] is False

    def test_explanation_column_captured(self, scrape_mod):
        """Post-2023 graded reports have an Explanation column populated."""
        import logging
        log = logging.getLogger("test")
        recs = scrape_mod["parse_index"](INDEX_HTML, log)
        by_id = {r["sighting_id"]: r for r in recs}
        assert by_id[149]["explanation"] == "Aircraft"
        assert by_id[111]["explanation"] == ""

    def test_handles_empty_shape(self, scrape_mod):
        import logging
        log = logging.getLogger("test")
        recs = scrape_mod["parse_index"](INDEX_HTML, log)
        by_id = {r["sighting_id"]: r for r in recs}
        assert by_id[111]["shape"] == ""
        assert by_id[114]["shape"] == "Disc"

    def test_no_table_returns_empty(self, scrape_mod):
        import logging
        log = logging.getLogger("test")
        recs = scrape_mod["parse_index"]("<html><body>No table here</body></html>", log)
        assert recs == []


# ---------- Tests: detail parser ----------

class TestDetailParser:
    """parse_detail extracts the stats block and the narrative body."""

    def test_extracts_sighting_id(self, scrape_mod):
        rec = scrape_mod["parse_detail"](DETAIL_HTML, 111)
        assert rec["sighting_id"] == 111

    def test_extracts_stat_block(self, scrape_mod):
        rec = scrape_mod["parse_detail"](DETAIL_HTML, 111)
        assert rec["occurred"] == "02/02/1995 23:00"
        assert rec["reported"] == "02/03/1995"
        assert rec["posted"] == "02/04/1995"
        assert "Shady Grove" in rec["location"]
        assert rec["shape"] == "Light"
        assert rec["duration"] == "5 minutes"

    def test_extracts_narrative(self, scrape_mod):
        rec = scrape_mod["parse_detail"](DETAIL_HTML, 111)
        # Should contain the narrative body
        assert "Man and wife" in rec["narrative"]
        assert "flashing green and red lights" in rec["narrative"]

    def test_narrative_excludes_stat_lines(self, scrape_mod):
        """The narrative should not contain the 'Occurred:' / 'Reported:' lines."""
        rec = scrape_mod["parse_detail"](DETAIL_HTML, 111)
        assert "Occurred: 02/02/1995" not in rec["narrative"]
        assert "Shape: Light" not in rec["narrative"]

    def test_scraped_at_is_iso_utc(self, scrape_mod):
        rec = scrape_mod["parse_detail"](DETAIL_HTML, 111)
        assert rec["scraped_at"]
        # Should be parseable as ISO 8601
        ts = pd.Timestamp(rec["scraped_at"])
        assert ts.tz is not None  # has timezone info


# ---------- Tests: JSONL acquisition ----------

class TestJsonlAcquisition:
    """01_acquire.py JSONL mode combines scraped reports with the index."""

    def test_loads_and_joins(self, acquire_mod, tmp_path):
        # Build a minimal index CSV and JSONL pair
        index = pd.DataFrame([
            {"sighting_id": 111, "occurred": "02/02/1995 23:00", "city": "Shady Grove",
             "state": "OR", "country": "USA", "shape": "",
             "summary": "summary", "reported": "02/03/1995", "media": "",
             "explanation": "", "is_tier1": False},
            {"sighting_id": 114, "occurred": "02/02/1995 20:10", "city": "Traverse City",
             "state": "MI", "country": "USA", "shape": "Disc",
             "summary": "summary", "reported": "02/03/1995", "media": "Y",
             "explanation": "", "is_tier1": True},
        ])
        index_path = tmp_path / "nuforc_index.csv"
        index.to_csv(index_path, index=False)

        jsonl_path = tmp_path / "nuforc_reports.jsonl"
        with open(jsonl_path, "w") as f:
            f.write(json.dumps({
                "sighting_id": 111,
                "occurred": "02/02/1995 23:00",
                "reported": "02/03/1995",
                "posted": "02/04/1995",
                "location": "Shady Grove, OR, USA",
                "shape": "Light",
                "duration": "5 minutes",
                "narrative": "Man and wife saw a bright light.",
                "scraped_at": "2026-05-21T12:00:00+00:00",
            }) + "\n")
            f.write(json.dumps({
                "sighting_id": 114,
                "occurred": "02/02/1995 20:10",
                "reported": "02/03/1995",
                "posted": "02/04/1995",
                "location": "Traverse City, MI, USA",
                "shape": "Disc",
                "duration": "10 minutes",
                "narrative": "Four children reported seeing a disc above them.",
                "scraped_at": "2026-05-21T12:00:01+00:00",
            }) + "\n")

        df = acquire_mod["load_jsonl_scrape"](jsonl_path, index_path)
        assert len(df) == 2
        # Canonical columns present
        for col in ["datetime", "city", "state", "country", "shape",
                    "comments", "tier1", "explanation", "source_id"]:
            assert col in df.columns, f"missing {col}"

    def test_tier1_propagates(self, acquire_mod, tmp_path):
        index = pd.DataFrame([
            {"sighting_id": 114, "occurred": "02/02/1995 20:10", "city": "Traverse City",
             "state": "MI", "country": "USA", "shape": "Disc",
             "summary": "summary", "reported": "02/03/1995", "media": "",
             "explanation": "", "is_tier1": True},
        ])
        index_path = tmp_path / "nuforc_index.csv"
        index.to_csv(index_path, index=False)

        jsonl_path = tmp_path / "nuforc_reports.jsonl"
        with open(jsonl_path, "w") as f:
            f.write(json.dumps({
                "sighting_id": 114,
                "occurred": "02/02/1995 20:10",
                "narrative": "Disc sighting narrative.",
                "shape": "Disc",
                "scraped_at": "2026-05-21T12:00:00+00:00",
            }) + "\n")

        df = acquire_mod["load_jsonl_scrape"](jsonl_path, index_path)
        assert df["tier1"].iloc[0] is True or df["tier1"].iloc[0] == True  # noqa

    def test_missing_index_exits(self, acquire_mod, tmp_path):
        jsonl_path = tmp_path / "nuforc_reports.jsonl"
        jsonl_path.write_text("")
        with pytest.raises(SystemExit):
            acquire_mod["load_jsonl_scrape"](jsonl_path,
                                              tmp_path / "missing.csv")

    def test_skips_malformed_jsonl_lines(self, acquire_mod, tmp_path, capsys):
        index = pd.DataFrame([{
            "sighting_id": 111, "occurred": "1/1/95 00:00", "city": "X",
            "state": "XX", "country": "USA", "shape": "",
            "summary": "", "reported": "", "media": "", "explanation": "",
            "is_tier1": False,
        }])
        index_path = tmp_path / "nuforc_index.csv"
        index.to_csv(index_path, index=False)

        jsonl_path = tmp_path / "nuforc_reports.jsonl"
        with open(jsonl_path, "w") as f:
            f.write('{"sighting_id": 111, "narrative": "valid"}\n')
            f.write('not json at all\n')
            f.write('\n')  # blank, should skip silently
        df = acquire_mod["load_jsonl_scrape"](jsonl_path, index_path)
        assert len(df) == 1
