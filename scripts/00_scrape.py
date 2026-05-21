"""
00_scrape.py

Scrapes the NUFORC public databank with explicit research permission
granted by Christian Stepien, NUFORC CTO, on 2026-05-21.

Two-stage scrape:
  Stage A: Pull the all-reports index page once. Extract every report's
           ID, summary metadata, and detail URL.
  Stage B: Visit each detail page, extract the full narrative text and
           any structured fields, write to a JSON Lines file as we go.

Outputs:
  data/raw/nuforc_index.csv               Stage A output (metadata only)
  data/raw/nuforc_reports.jsonl           Stage B output (one report per line)
  data/raw/nuforc_scrape.log              Run log
  data/raw/nuforc_scrape_state.json       Resume state

Politeness:
  - 2.5 second delay between detail requests (configurable)
  - One connection at a time
  - Identifying User-Agent with your contact info
  - Resumes from last completed ID on restart
  - Saves state every 50 reports

Run:
  python scripts/00_scrape.py --contact you@example.com
  python scripts/00_scrape.py --contact you@example.com --max 100   # smoke test
  python scripts/00_scrape.py --contact you@example.com --resume     # resume from last
"""

import argparse
import json
import logging
import random
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
INDEX_PATH = RAW_DIR / "nuforc_index.csv"
REPORTS_PATH = RAW_DIR / "nuforc_reports.jsonl"
STATE_PATH = RAW_DIR / "nuforc_scrape_state.json"
LOG_PATH = RAW_DIR / "nuforc_scrape.log"

BASE = "https://nuforc.org"
INDEX_URL = f"{BASE}/subndx/?id=all"
SIGHTING_URL = f"{BASE}/sighting/?id={{id}}"

# Politeness defaults
DEFAULT_DELAY = 2.5
JITTER = 0.5
STATE_INTERVAL = 50
TIMEOUT = 30

# How many consecutive failures before we give up
MAX_CONSECUTIVE_FAILURES = 10


def setup_logging() -> logging.Logger:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    fmt = "%(asctime)s %(levelname)s %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=fmt,
        handlers=[
            logging.FileHandler(LOG_PATH),
            logging.StreamHandler(sys.stdout),
        ],
    )
    return logging.getLogger("scrape")


def make_session(contact: str) -> requests.Session:
    """Build a session with an identifying User-Agent. The contact email
    and permission reference are encoded so the operator can see who's
    pulling and verify the permission if they need to."""
    s = requests.Session()
    ua = (
        "UAP-Corpus-Research/0.1 "
        f"(non-commercial research; contact: {contact}; "
        "nuforc-permission-date: 2026-05-21)"
    )
    s.headers.update({
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    })
    return s


def get(session: requests.Session, url: str, log: logging.Logger,
        retries: int = 3) -> str | None:
    """GET with retries and exponential backoff. Returns text or None."""
    delay = 4
    for attempt in range(retries):
        try:
            r = session.get(url, timeout=TIMEOUT)
            if r.status_code == 200:
                return r.text
            if r.status_code == 404:
                log.warning(f"404 {url}")
                return None
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", delay * 4))
                log.warning(f"429 rate limited, sleeping {wait}s")
                time.sleep(wait)
                continue
            log.warning(f"HTTP {r.status_code} {url}, attempt {attempt+1}")
        except (requests.RequestException, requests.Timeout) as e:
            log.warning(f"exception on {url}: {e}, attempt {attempt+1}")
        time.sleep(delay)
        delay *= 2
    return None


# ---------- Stage A: index ----------

def parse_index(html: str, log: logging.Logger) -> list[dict]:
    """Parse the all-reports index. Returns a list of dicts with report
    metadata and the sighting ID."""
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table")
    if not table:
        log.error("no table found on index page")
        return []

    rows = table.find_all("tr")
    log.info(f"index has {len(rows)} table rows (including header)")

    out = []
    for tr in rows:
        cells = tr.find_all("td")
        if len(cells) < 9:
            continue

        link_cell = cells[0]
        a = link_cell.find("a")
        if not a or not a.get("href"):
            continue
        href = a["href"]
        m = re.search(r"id=(\d+)", href)
        if not m:
            continue
        sid = int(m.group(1))

        # The link text is "Open" or "Open !" — the trailing ! marks Tier 1
        tier_marker = a.get_text(strip=True)
        is_tier1 = "!" in tier_marker

        out.append({
            "sighting_id":  sid,
            "occurred":     cells[1].get_text(strip=True),
            "city":         cells[2].get_text(strip=True),
            "state":        cells[3].get_text(strip=True),
            "country":      cells[4].get_text(strip=True),
            "shape":        cells[5].get_text(strip=True),
            "summary":      cells[6].get_text(strip=True),
            "reported":     cells[7].get_text(strip=True),
            "media":        cells[8].get_text(strip=True),
            "explanation":  cells[9].get_text(strip=True) if len(cells) > 9 else "",
            "is_tier1":     is_tier1,
        })

    return out


def write_index(records: list[dict], log: logging.Logger) -> None:
    import csv
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "sighting_id", "occurred", "city", "state", "country",
        "shape", "summary", "reported", "media", "explanation",
        "is_tier1",
    ]
    with open(INDEX_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(records)
    log.info(f"wrote index with {len(records):,} rows to {INDEX_PATH}")


# ---------- Stage B: detail pages ----------

def parse_detail(html: str, sighting_id: int) -> dict:
    """Parse a single sighting detail page. Robust to layout variations:
    the page has a stats block (occurred / reported / posted / location /
    shape / duration) followed by the narrative."""
    soup = BeautifulSoup(html, "html.parser")

    out: dict = {"sighting_id": sighting_id}

    # The main content is in <main> or under #main. Drop the chrome.
    main = soup.find("main") or soup.find(id="main") or soup
    text = main.get_text("\n", strip=True)

    # Stats appear as "Label: value" lines near the top
    stat_pattern = re.compile(
        r"(Occurred|Reported|Posted|Location|Shape|Duration|Characteristics):\s*(.+)"
    )
    stats: dict[str, str] = {}
    for line in text.splitlines():
        m = stat_pattern.match(line.strip())
        if m:
            stats[m.group(1).lower()] = m.group(2).strip()

    for k in ("occurred", "reported", "posted", "location", "shape",
              "duration", "characteristics"):
        out[k] = stats.get(k, "")

    # Narrative: the body text below the stats. Heuristic: take everything
    # after the last stat line we found.
    narrative = text
    if stats:
        # Find the last stat line in the raw text and slice after it
        last_stat_line = None
        for line in text.splitlines():
            if stat_pattern.match(line.strip()):
                last_stat_line = line
        if last_stat_line:
            idx = text.find(last_stat_line)
            if idx >= 0:
                narrative = text[idx + len(last_stat_line):].strip()

    # Trim navigation / footer leftovers if any slipped through
    narrative = re.sub(
        r"(Posts|Data Bank|Map|Gallery|File a UFO Report|Donate|About Us).*$",
        "",
        narrative,
        flags=re.DOTALL,
    ).strip()

    out["narrative"] = narrative
    out["scraped_at"] = datetime.now(timezone.utc).isoformat()
    return out


# ---------- state / resume ----------

def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {"completed_ids": [], "failed_ids": [], "last_index_fetch": None}


def save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, indent=2, sort_keys=True))


def already_done_ids() -> set[int]:
    """Return IDs already present in the reports.jsonl, so we can resume
    safely even if state.json was lost."""
    if not REPORTS_PATH.exists():
        return set()
    done = set()
    with open(REPORTS_PATH, encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
                done.add(int(rec["sighting_id"]))
            except (json.JSONDecodeError, KeyError, ValueError):
                continue
    return done


# ---------- main ----------

def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--contact", required=True,
                        help="Your email, included in the User-Agent header")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY,
                        help=f"Seconds between detail requests (default {DEFAULT_DELAY})")
    parser.add_argument("--max", type=int, default=None,
                        help="Only scrape this many detail pages (smoke test)")
    parser.add_argument("--resume", action="store_true",
                        help="Resume scraping; skip IDs already in reports.jsonl")
    parser.add_argument("--refresh-index", action="store_true",
                        help="Re-fetch the index page even if cached")
    parser.add_argument("--start-id", type=int, default=None,
                        help="Begin from a specific sighting ID (for targeted reruns)")
    args = parser.parse_args()

    log = setup_logging()
    log.info("=" * 60)
    log.info(f"NUFORC scrape starting; contact={args.contact}; delay={args.delay}s")
    log.info(f"permission: research use granted by Christian Stepien, NUFORC CTO, 2026-05-21")

    session = make_session(args.contact)
    state = load_state()

    # Stage A: index
    need_index = args.refresh_index or not INDEX_PATH.exists()
    if need_index:
        log.info(f"fetching index from {INDEX_URL}")
        html = get(session, INDEX_URL, log)
        if not html:
            log.error("could not fetch index, aborting")
            sys.exit(1)
        records = parse_index(html, log)
        if not records:
            log.error("index parse returned 0 records, aborting")
            sys.exit(1)
        write_index(records, log)
        state["last_index_fetch"] = datetime.now(timezone.utc).isoformat()
        save_state(state)
    else:
        log.info(f"using cached index at {INDEX_PATH}")

    # Load index back as the canonical source of IDs to scrape
    import csv
    with open(INDEX_PATH, encoding="utf-8") as f:
        index_records = list(csv.DictReader(f))

    log.info(f"index loaded: {len(index_records):,} reports")

    # Stage B: detail pages
    done = already_done_ids()
    if done:
        log.info(f"resume: {len(done):,} IDs already in reports.jsonl")

    todo = []
    for rec in index_records:
        sid = int(rec["sighting_id"])
        if args.resume and sid in done:
            continue
        if args.start_id is not None and sid < args.start_id:
            continue
        todo.append(sid)

    if args.max:
        todo = todo[: args.max]

    log.info(f"detail scrape: {len(todo):,} IDs to fetch")

    consecutive_failures = 0
    scraped_this_run = 0

    # Open reports.jsonl in append mode so resume continues cleanly
    with open(REPORTS_PATH, "a", encoding="utf-8") as out_f:
        for i, sid in enumerate(todo, start=1):
            url = SIGHTING_URL.format(id=sid)
            html = get(session, url, log)
            if not html:
                consecutive_failures += 1
                state["failed_ids"].append(sid)
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    log.error(f"{MAX_CONSECUTIVE_FAILURES} consecutive failures, "
                              f"aborting at sid={sid}")
                    save_state(state)
                    sys.exit(2)
            else:
                consecutive_failures = 0
                rec = parse_detail(html, sid)
                out_f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                out_f.flush()
                state["completed_ids"].append(sid)
                scraped_this_run += 1

            # Periodic state save and progress log
            if i % STATE_INTERVAL == 0:
                save_state(state)
                pct = i / len(todo) * 100
                log.info(f"progress: {i:,}/{len(todo):,} ({pct:.1f}%), "
                         f"scraped this run: {scraped_this_run:,}")

            # Polite throttle with small jitter
            sleep_s = args.delay + random.uniform(0, JITTER)
            time.sleep(sleep_s)

    save_state(state)
    log.info(f"done. scraped {scraped_this_run:,} reports this run.")
    log.info(f"total in reports.jsonl: {len(already_done_ids()):,}")


if __name__ == "__main__":
    main()
