#!/usr/bin/env python3
"""
CoreWeave GPU pricing scraper (from HTML source).

Usage:
  python coreweave_scraper.py --file /mnt/data/coreweaves.html
  python coreweave_scraper.py --url  https://coreweave.com/gpu-cloud-pricing  --out-csv coreweave.csv --out-json coreweave.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup


# ----------------------------
# I/O helpers
# ----------------------------
def load_html_from_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def load_html_from_url(url: str, timeout_s: int = 30) -> str:
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        },
    )
    with urlopen(req, timeout=timeout_s) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="ignore")


# ----------------------------
# Parsing
# ----------------------------
_PRICE_RE = re.compile(r"\$?\s*([0-9]+(?:\.[0-9]+)?)")
_INT_RE = re.compile(r"^\s*([0-9][0-9,]*)\s*$")


def _clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _parse_int(s: str) -> Optional[int]:
    s = _clean_text(s)
    m = _INT_RE.match(s)
    if not m:
        return None
    return int(m.group(1).replace(",", ""))


def _parse_float(s: str) -> Optional[float]:
    s = _clean_text(s)
    m = _PRICE_RE.search(s)
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


@dataclass
class CoreWeaveGpuPriceRow:
    provider: str
    product: str
    gpu_count: Optional[int] = None
    vram_gb: Optional[int] = None
    vcpus: Optional[int] = None
    system_ram_gb: Optional[int] = None
    local_storage_tb: Optional[float] = None
    price_per_hour_usd: Optional[float] = None
    raw_price: Optional[str] = None


def parse_coreweave_gpu_pricing(html: str) -> List[Dict[str, Any]]:
    """
    Extract GPU rows from CoreWeave pricing HTML.

    Observed row structure:
      div.table-row-v2.w-dyn-item.kubernetes-gpu-pricing
        div.table-grid
          div.table-v2-cell--name -> h3.table-model-name
          subsequent div.table-v2-cell -> numeric columns
          last div.table-v2-cell -> "$.."
    """
    soup = BeautifulSoup(html, "html.parser")

    rows: List[CoreWeaveGpuPriceRow] = []

    # Prefer the explicit GPU pricing rows on the page
    candidate_rows = soup.select("div.table-row-v2.w-dyn-item.kubernetes-gpu-pricing")
    if not candidate_rows:
        # Fallback: anything that *looks* like GPU pricing rows (more permissive)
        candidate_rows = soup.select("div.table-row-v2.w-dyn-item")

    for r in candidate_rows:
        grid = r.select_one("div.table-grid")
        if not grid:
            continue

        name_el = grid.select_one("h3.table-model-name")
        product = _clean_text(name_el.get_text(" ", strip=True)) if name_el else ""
        if not product:
            continue

        # Heuristic: keep GPU-ish rows (avoid CPU/network/etc.)
        # You can expand this allowlist as needed.
        gpu_keywords = ("nvidia", "a100", "h100", "h200", "l40", "l4", "rtx", "blackwell", "gb200", "gb300")
        if not any(k in product.lower() for k in gpu_keywords):
            # If this row still has a $ price and a "GPU Count" style column count, allow it.
            pass

        cells = grid.select(":scope > div.table-v2-cell")
        if not cells or len(cells) < 2:
            continue

        # Extract visible cell texts in order (skip empty)
        cell_texts: List[str] = []
        for c in cells:
            txt = _clean_text(c.get_text(" ", strip=True))
            if txt:
                cell_texts.append(txt)

        # Find price text (usually last; contains "$")
        raw_price = None
        price = None
        for txt in reversed(cell_texts):
            if "$" in txt:
                raw_price = txt
                price = _parse_float(txt)
                break

        # If no price, skip (not a pricing row)
        if price is None:
            continue

        # Now parse columns by position where possible.
        # Typical observed ordering for GPU rows:
        #   [product, gpu_count, vram, vcpus, system_ram, local_storage, price]
        # But keep it defensive if CoreWeave changes layout.
        gpu_count = _parse_int(cell_texts[1]) if len(cell_texts) > 1 else None
        vram_gb = _parse_int(cell_texts[2]) if len(cell_texts) > 2 else None
        vcpus = _parse_int(cell_texts[3]) if len(cell_texts) > 3 else None
        system_ram_gb = _parse_int(cell_texts[4]) if len(cell_texts) > 4 else None

        local_storage_tb: Optional[float] = None
        if len(cell_texts) > 5:
            # local storage is often a float like "7.68"
            try:
                local_storage_tb = float(cell_texts[5].replace(",", ""))
            except ValueError:
                local_storage_tb = None

        row_obj = CoreWeaveGpuPriceRow(
            provider="coreweave",
            product=product,
            gpu_count=gpu_count,
            vram_gb=vram_gb,
            vcpus=vcpus,
            system_ram_gb=system_ram_gb,
            local_storage_tb=local_storage_tb,
            price_per_hour_usd=price,
            raw_price=raw_price,
        )

        # Final heuristic gate: ensure it's actually GPU pricing
        # (avoid e.g., CPU table rows that also have $/hr)
        if any(k in product.lower() for k in gpu_keywords) or (row_obj.gpu_count and row_obj.vram_gb):
            rows.append(row_obj)

    return [asdict(x) for x in rows]


# ----------------------------
# Outputs
# ----------------------------
def write_csv(path: str, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        # still emit a header-only file for consistency
        fieldnames = [
            "provider",
            "product",
            "gpu_count",
            "vram_gb",
            "vcpus",
            "system_ram_gb",
            "local_storage_tb",
            "price_per_hour_usd",
            "raw_price",
        ]
        with open(path, "w", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=fieldnames).writeheader()
        return

    fieldnames = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)


def write_json(path: str, rows: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)


# ----------------------------
# CLI entrypoint (Lambda-style)
# ----------------------------
def scrape(url: str, out_csv: str, out_json: str):
    """
    Scrape CoreWeave GPU pricing from URL and write to CSV/JSON files.
    
    Args:
        url: URL to scrape
        out_csv: Output CSV file path
        out_json: Output JSON file path
    """
    html = load_html_from_url(url)
    rows = parse_coreweave_gpu_pricing(html)
    write_csv(out_csv, rows)
    write_json(out_json, rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", help="Path to HTML file (e.g., /mnt/data/coreweaves.html)")
    src.add_argument("--url", help="URL to scrape (live page)")
    ap.add_argument("--out-csv", default="coreweave_gpu_prices.csv", help="Output CSV filename")
    ap.add_argument("--out-json", default="coreweave_gpu_prices.json", help="Output JSON filename")
    args = ap.parse_args()

    html = load_html_from_file(args.file) if args.file else load_html_from_url(args.url)

    rows = parse_coreweave_gpu_pricing(html)

    write_csv(args.out_csv, rows)
    write_json(args.out_json, rows)

    print(f"Parsed {len(rows)} GPU pricing rows")
    print(f"Wrote: {args.out_csv}")
    print(f"Wrote: {args.out_json}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)