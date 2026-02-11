#!/usr/bin/env python3
"""
Merge multiple provider JSON files into a single all.json
and generate a meta.json.

Example:
  python merge_all.py --in-dir out --out-json out/all.json
"""

import argparse
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime, timezone


def load_json(path: Path) -> List[Dict[str, Any]]:
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("JSON root is not a list")
        return data
    except Exception as e:
        raise RuntimeError(f"Failed to load {path}: {e}") from e


def merge_json_files(in_dir: Path):
    merged: List[Dict[str, Any]] = []
    providers = set()
    sources = []

    for p in sorted(in_dir.glob("*.json")):
        if p.name in ("all.json", "meta.json") or p.name.endswith("_meta.json"):
            continue

        rows = load_json(p)
        sources.append(p.name)

        for r in rows:
            if "provider" in r and r["provider"]:
                providers.add(str(r["provider"]))
            else:
                # fallback: infer provider from filename
                inferred = p.stem
                r["provider"] = inferred
                providers.add(inferred)

            merged.append(r)

    return merged, sorted(providers), sources


def write_all_json(path: Path, rows: List[Dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)


def write_meta_json(
    path: Path,
    rows_count: int,
    providers: List[str],
    sources: List[str],
) -> None:
    meta = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rows": rows_count,
        "providers": providers,
        "sources": sources,
    }
    with path.open("w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in-dir", required=True, help="Directory containing provider JSON files")
    ap.add_argument("--out-json", required=True, help="Output merged JSON file")
    args = ap.parse_args()

    in_dir = Path(args.in_dir)
    out_json = Path(args.out_json)
    out_meta = out_json.with_name("meta.json")

    if not in_dir.exists() or not in_dir.is_dir():
        raise SystemExit(f"Input directory does not exist: {in_dir}")

    merged, providers, sources = merge_json_files(in_dir)

    out_json.parent.mkdir(parents=True, exist_ok=True)
    write_all_json(out_json, merged)
    write_meta_json(out_meta, len(merged), providers, sources)

    print(f"Merged {len(merged)} rows into {out_json}")
    print(f"Wrote metadata to {out_meta}")


if __name__ == "__main__":
    main()
