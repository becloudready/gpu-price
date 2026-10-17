#!/usr/bin/env python3
"""Run every price job independently and write one result file per job.

A failing job never blocks the others: its previous good file is kept and marked
`stale`. Quarantined (out-of-bounds) rows and raw upstream responses go to --raw-dir,
which is archived but never published.

Usage (from repo root):
  python -m scraper.run_all --out-dir data --raw-dir raw [--previous-dir prev] [--strict]
"""

from __future__ import annotations

import argparse
import json
import sys
import traceback
from datetime import datetime, timezone
from functools import partial
from pathlib import Path

from scraper.schema import Offer, collapse_regions, in_bounds
from scraper.sources import gpuhunt, linode, lium, shadeform, vultr

# name -> (fetch(raw) callable, minimum rows expected; fewer is treated as a failure)
JOBS = {
    **{
        f"gpuhunt-{pid}": (partial(gpuhunt.fetch_provider, pid), 5)
        for pid in gpuhunt.PROVIDERS
    },
    "shadeform": (shadeform.fetch, 20),
    "linode": (linode.fetch, 3),
    "vultr": (vultr.fetch, 3),
    "lium": (lium.fetch, 5),
}
# Small catalogs
MIN_ROWS_OVERRIDE = {"gpuhunt-cloudrift": 3}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_previous(previous_dir: Path | None, name: str) -> dict | None:
    if not previous_dir:
        return None
    path = previous_dir / f"{name}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def run_job(name: str, fetch, min_rows: int, raw_dir: Path) -> tuple[list[dict], list[dict]]:
    def raw(filename: str, data: bytes) -> None:
        d = raw_dir / name
        d.mkdir(parents=True, exist_ok=True)
        (d / filename).write_bytes(data)

    offers: list[Offer] = collapse_regions(fetch(raw))
    good = [o for o in offers if in_bounds(o.gpu_model, o.price_per_gpu_hour_usd)]
    bad = [o for o in offers if o not in good]
    if len(good) < min_rows:
        raise RuntimeError(f"only {len(good)} valid rows (expected >= {min_rows}); {len(bad)} quarantined")
    return [o.to_dict() for o in good], [o.to_dict() for o in bad]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default="data", help="Published output directory")
    ap.add_argument("--raw-dir", default="raw", help="Unpublished raw responses and quarantine")
    ap.add_argument("--previous-dir", help="Directory holding the last published job files")
    ap.add_argument("--strict", action="store_true", help="Exit non-zero if any job failed")
    args = ap.parse_args()

    jobs_dir = Path(args.out_dir) / "jobs"
    raw_dir = Path(args.raw_dir)
    jobs_dir.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)
    previous_dir = Path(args.previous_dir) if args.previous_dir else None

    failures = 0
    for name, (fetch, min_rows) in JOBS.items():
        min_rows = MIN_ROWS_OVERRIDE.get(name, min_rows)
        try:
            rows, quarantined = run_job(name, fetch, min_rows, raw_dir)
            result = {"job": name, "stale": False, "last_success": now(), "error": None, "rows": rows}
            if quarantined:
                (raw_dir / name).mkdir(parents=True, exist_ok=True)
                (raw_dir / name / "quarantine.json").write_text(json.dumps(quarantined, indent=2))
            print(f"ok    {name}: {len(rows)} rows, {len(quarantined)} quarantined")
        except Exception as e:
            failures += 1
            traceback.print_exc()
            prev = load_previous(previous_dir, name) or {}
            result = {
                "job": name,
                "stale": True,
                "last_success": prev.get("last_success"),
                "error": f"{type(e).__name__}: {e}",
                "rows": prev.get("rows", []),
            }
            print(f"FAIL  {name}: {e} (kept {len(result['rows'])} previous rows)")
        (jobs_dir / f"{name}.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")

    return 1 if (args.strict and failures) else 0


if __name__ == "__main__":
    sys.exit(main())
