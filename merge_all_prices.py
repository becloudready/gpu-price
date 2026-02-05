#!/usr/bin/env python3
"""
Merge multiple provider JSON files into a single all.json

Example:
  python merge_all.py --in-dir out --out-json out/all.json
"""

import argparse
import json
from pathlib import Path
from typing import List, Dict, Any


def load_json(path: Path) -> List[Dict[str, Any]]:
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("JSON root is not a list")
        return data
    except Exception as e:
        raise RuntimeError(f"Failed to load {path}: {e}") from e


def merge_json_files(in_dir: Path) -> List[Dict[str, Any]]:
    merged: List[Dict[str, Any]] = []

    for p in sorted(in_dir.glob("*.json")):
        if p.name == "all.json" or p.name.endswith("_meta.json"):
            continue

        rows = load_json(p)
        for r in rows:
            # Optional: annotate source filename if provider missing
            if "provider" not in r:
                r["provider"] = p.stem
            merged.append(r)

    return merged


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in-dir", required=True, help="Directory containing provider JSON files")
    ap.add_argument("--out-json", required=True, help="Output merged JSON file")
    args = ap.parse_args()

    in_dir = Path(args.in_dir)
    out_json = Path(args.out_json)

    if not in_dir.exists() or not in_dir.is_dir():
        raise SystemExit(f"Input directory does not exist: {in_dir}")

    merged = merge_json_files(in_dir)

    out_json.parent.mkdir(parents=True, exist_ok=True)
    with out_json.open("w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(f"Merged {len(merged)} rows into {out_json}")


if __name__ == "__main__":
    main()
