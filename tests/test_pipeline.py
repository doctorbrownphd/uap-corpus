"""
Unit tests for the cleaning and acquisition logic.

Run from the project root with:
    pytest tests/ -v
"""

import sys
from pathlib import Path

import pandas as pd
import pytest

# Make scripts/ importable. The scripts have numeric prefixes which break
# normal import; use importlib to load them by path.
SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))


def _load_module(filename: str):
    """Load a script by filename as a module without executing main()."""
    import importlib.util
    path = SCRIPTS_DIR / filename
    src = path.read_text().replace(
        'if __name__ == "__main__":\n    main()',
        ""
    )
    ns = {"__file__": str(path)}
    exec(src, ns)
    return ns


@pytest.fixture(scope="module")
def clean_mod():
    return _load_module("02_clean.py")


@pytest.fixture(scope="module")
def acquire_mod():
    return _load_module("01_acquire.py")


class TestDatetimeParser:
    """parse_nuforc_datetime handles NUFORC's quirky date formats."""

    def test_four_digit_year(self, clean_mod):
        out = clean_mod["parse_nuforc_datetime"]("10/10/1949 20:30")
        assert out.year == 1949
        assert out.month == 10
        assert out.day == 10
        assert out.hour == 20
        assert out.minute == 30

    def test_two_digit_year_legacy(self, clean_mod):
        out = clean_mod["parse_nuforc_datetime"]("10/10/49 20:30")
        assert out.year == 1949

    def test_two_digit_year_recent(self, clean_mod):
        out = clean_mod["parse_nuforc_datetime"]("1/15/24 22:00")
        assert out.year == 2024

    def test_pivot_boundary_29_is_2029(self, clean_mod):
        """Year 29 should pivot to 2029, not 1929."""
        out = clean_mod["parse_nuforc_datetime"]("12/31/29 23:59")
        assert out.year == 2029

    def test_pivot_boundary_30_is_1930(self, clean_mod):
        """Year 30 should pivot to 1930, not 2030."""
        out = clean_mod["parse_nuforc_datetime"]("1/1/30 00:00")
        assert out.year == 1930

    @pytest.mark.parametrize("bad_input", ["garbage", "", None, "13/45/99 25:99"])
    def test_unparseable_returns_nat(self, clean_mod, bad_input):
        out = clean_mod["parse_nuforc_datetime"](bad_input)
        assert pd.isna(out)


class TestNarrativeCleaner:
    """clean_narrative decodes entities, collapses whitespace."""

    def test_simple_passthrough(self, clean_mod):
        assert clean_mod["clean_narrative"]("Saw a light.") == "Saw a light."

    def test_html_entities_decoded(self, clean_mod):
        out = clean_mod["clean_narrative"]("Two&#44; bright lights&apos;")
        assert out == "Two, bright lights'"

    def test_newlines_to_paragraph_breaks(self, clean_mod):
        out = clean_mod["clean_narrative"]("Line one\nLine two")
        assert out == "Line one\n\nLine two"

    def test_whitespace_collapse(self, clean_mod):
        out = clean_mod["clean_narrative"]("   leading   and    trailing   ")
        assert out == "leading and trailing"

    def test_none_returns_empty(self, clean_mod):
        assert clean_mod["clean_narrative"](None) == ""

    def test_nan_returns_empty(self, clean_mod):
        assert clean_mod["clean_narrative"](pd.NA) == ""


class TestShapeNormalization:
    """clean_shape merges common variants."""

    def test_passthrough(self, clean_mod):
        assert clean_mod["clean_shape"]("triangle") == "triangle"

    def test_alias_round_to_sphere(self, clean_mod):
        assert clean_mod["clean_shape"]("round") == "sphere"

    def test_alias_disk_to_disc(self, clean_mod):
        assert clean_mod["clean_shape"]("disk") == "disc"

    def test_alias_changed_to_changing(self, clean_mod):
        assert clean_mod["clean_shape"]("changed") == "changing"

    def test_lowercase_normalization(self, clean_mod):
        assert clean_mod["clean_shape"]("TRIANGLE") == "triangle"

    def test_strip_whitespace(self, clean_mod):
        assert clean_mod["clean_shape"]("  circle  ") == "circle"


class TestSchemaDetection:
    """detect_schema picks the right variant from column names."""

    def test_scrubbed_v1_with_trailing_space(self, acquire_mod):
        cols = [
            "datetime", "city", "state", "country", "shape",
            "duration (seconds)", "duration (hours/min)", "comments",
            "date posted", "latitude", "longitude ",
        ]
        df = pd.DataFrame(columns=cols)
        assert acquire_mod["detect_schema"](df) == "scrubbed_v1"

    def test_scrubbed_v2_no_trailing_space(self, acquire_mod):
        cols = [
            "datetime", "city", "state", "country", "shape",
            "duration (seconds)", "duration (hours/min)", "comments",
            "date posted", "latitude", "longitude",
        ]
        df = pd.DataFrame(columns=cols)
        assert acquire_mod["detect_schema"](df) == "scrubbed_v2"

    def test_renner_csv(self, acquire_mod):
        cols = [
            "date_time", "city", "state", "country", "shape",
            "duration", "text", "posted", "city_latitude", "city_longitude",
        ]
        df = pd.DataFrame(columns=cols)
        assert acquire_mod["detect_schema"](df) == "renner_csv"

    def test_unknown_schema_raises(self, acquire_mod):
        df = pd.DataFrame(columns=["foo", "bar", "baz"])
        with pytest.raises(ValueError, match="Could not identify schema"):
            acquire_mod["detect_schema"](df)


class TestNormalization:
    """normalize produces canonical columns + source_id."""

    def test_end_to_end_scrubbed(self, acquire_mod):
        df = pd.DataFrame([{
            "datetime": "10/10/1949 20:30",
            "city": "san marcos",
            "state": "TX",
            "country": "us",
            "shape": "cylinder",
            "duration (seconds)": 2700,
            "duration (hours/min)": "45 minutes",
            "comments": "Cylinder in the sky.",
            "date posted": "4/27/2004",
            "latitude": 29.8830556,
            "longitude ": -97.9411111,
        }])
        out = acquire_mod["normalize"](df, "scrubbed_v1")

        # All canonical columns present
        for col in ["datetime", "city", "state", "shape", "comments",
                    "latitude", "longitude", "source_id"]:
            assert col in out.columns

        # source_id is stable and present
        assert out["source_id"].iloc[0]
        assert len(out["source_id"].iloc[0]) == 16

        # Longitude properly renamed despite the trailing space in source
        assert out["longitude"].iloc[0] == -97.9411111

    def test_source_id_stable_across_runs(self, acquire_mod):
        """Same row -> same source_id."""
        row = {
            "datetime": "10/10/1949 20:30",
            "city": "san marcos",
            "state": "TX",
            "country": "us",
            "shape": "cylinder",
            "duration (seconds)": 2700,
            "duration (hours/min)": "45 minutes",
            "comments": "Cylinder in the sky.",
            "date posted": "4/27/2004",
            "latitude": 29.88,
            "longitude ": -97.94,
        }
        df1 = pd.DataFrame([row])
        df2 = pd.DataFrame([row])
        out1 = acquire_mod["normalize"](df1, "scrubbed_v1")
        out2 = acquire_mod["normalize"](df2, "scrubbed_v1")
        assert out1["source_id"].iloc[0] == out2["source_id"].iloc[0]


class TestPDBoilerplateFilter:
    """strip_pd_boilerplate removes Peter Davenport editorial annotations."""

    def test_strips_anonymous_full(self, clean_mod):
        text = "I saw a light. Witness elects to remain totally anonymous; provides no contact information. PD"
        out = clean_mod["strip_pd_boilerplate"](text)
        assert "Witness elects" not in out
        assert "I saw a light." in out

    def test_strips_date_approximate(self, clean_mod):
        text = "Bright triangle. Witness indicates that the date of the sighting is approximate. PD"
        out = clean_mod["strip_pd_boilerplate"](text)
        assert "date of the sighting" not in out
        assert "Bright triangle." in out

    def test_strips_trailing_pd(self, clean_mod):
        text = "Strange object over the city. PD"
        out = clean_mod["strip_pd_boilerplate"](text)
        assert out == "Strange object over the city."

    def test_strips_nuforc_note(self, clean_mod):
        text = "Saw a disc.\nNUFORC Note: We believe this was a satellite."
        out = clean_mod["strip_pd_boilerplate"](text)
        assert "NUFORC Note" not in out
        assert "Saw a disc." in out

    def test_preserves_normal_narrative(self, clean_mod):
        text = "A bright orange orb hovered silently over the treeline for five minutes."
        out = clean_mod["strip_pd_boilerplate"](text)
        assert out == text

    def test_clean_narrative_applies_pd_filter(self, clean_mod):
        """Verify the full clean_narrative pipeline includes PD stripping."""
        raw = "I saw a UFO. Witness elects to remain totally anonymous; provides no contact information. PD"
        out = clean_mod["clean_narrative"](raw)
        assert "Witness elects" not in out
        assert "I saw a UFO." in out


class TestISODateParsing:
    """parse_nuforc_datetime handles kcimc-format ISO dates."""

    def test_iso_with_local_tz(self, clean_mod):
        out = clean_mod["parse_nuforc_datetime"]("2014-09-21 13:00:00 Local")
        assert out.year == 2014
        assert out.month == 9
        assert out.day == 21

    def test_iso_with_pacific_tz(self, clean_mod):
        out = clean_mod["parse_nuforc_datetime"]("2014-10-23 11:11:17 Pacific")
        assert out.year == 2014
        assert out.month == 10

    def test_iso_plain(self, clean_mod):
        out = clean_mod["parse_nuforc_datetime"]("2014-09-21 13:00:00")
        assert out.year == 2014


class TestKcimcSchema:
    """kcimc_v1 schema detection and Location parsing."""

    def test_detects_kcimc(self, acquire_mod):
        cols = [
            "Sighting", "Occurred", "Location", "Shape", "Duration",
            "No of observers", "Reported", "Posted", "Characteristics",
            "Summary", "Text", "Location details", "Explanation",
        ]
        df = pd.DataFrame(columns=cols)
        assert acquire_mod["detect_schema"](df) == "kcimc_v1"

    def test_parse_location_full(self, acquire_mod):
        city, state, country = acquire_mod["parse_kcimc_location"]("Huntsville, TX, USA")
        assert city == "Huntsville"
        assert state == "TX"
        assert country == "USA"

    def test_parse_location_two_parts(self, acquire_mod):
        city, state, _ = acquire_mod["parse_kcimc_location"]("Portland, OR")
        assert city == "Portland"
        assert state == "OR"

    def test_parse_location_empty(self, acquire_mod):
        city, state, country = acquire_mod["parse_kcimc_location"]("")
        assert city == ""
        assert state == ""
