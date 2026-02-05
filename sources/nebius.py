#!/usr/bin/env python3
"""
Nebius GPU pricing scraper (from HTML page source)

Usage:
  python nebius_scraper.py --file /mnt/data/nebius.html
  python nebius_scraper.py --url  "https://nebius.com/pricing/gpu"   # example
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup


# ----------------------------
# Data model
# ----------------------------
@dataclass
class NebiusGpuRow:
    provider: str
    product: str
    gpu_count: Optional[int] = None
    vram_gb: Optional[float] = None
    vcpus: Optional[int] = None
    system_ram_gb: Optional[int] = None
    local_storage_tb: Optional[float] = None
    price_per_hour_usd: Optional[float] = None


# ----------------------------
# I/O helpers
# ----------------------------
def load_html_from_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def load_html_from_url(url: str, timeout_s: int = 30) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; gpu-price-scraper/1.0)"}
    r = requests.get(url, headers=headers, timeout=timeout_s)
    r.raise_for_status()
    return r.text


# ----------------------------
# Parser (DOM-based)
# ----------------------------
def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _parse_float(s: Optional[str]) -> Optional[float]:
    """Extract float from price string like '$5.50' or '5.50'"""
    if not s:
        return None
    match = re.search(r'[-+]?\d*\.?\d+', s)
    if match:
        try:
            return float(match.group(0))
        except ValueError:
            return None
    return None


def _extract_int(s: Optional[str]) -> Optional[int]:
    """Extract integer from strings"""
    if not s:
        return None
    match = re.search(r'(\d+)', s)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None


def _extract_vram_from_product(product: str) -> Optional[float]:
    """Extract VRAM from product name like 'NVIDIA GB200 NVL72*' which has 186GB"""
    # Common patterns for GPU VRAM
    vram_patterns = {
        "GB200": 186,
        "B200": 180,
        "H200": 141,
        "H100": 80,
        "A100": 80,
        "L40S": 48,
        "L40": 48,
        "RTX PRO": 48,
    }
    
    for pattern, vram in vram_patterns.items():
        if pattern.upper() in product.upper():
            return float(vram)
    
    # Fallback: try to extract from string
    match = re.search(r'(\d+(?:\.\d+)?)\s*GB', product)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    
    return None


def parse_nebius_pricing(html: str, table_title: str = "NVIDIA GPU Instances") -> List[NebiusGpuRow]:
    soup = BeautifulSoup(html, "html.parser")

    # Find the highlight-table-block with the right title
    target_block = None
    for block in soup.select("div.pc-highlight-table-block"):
        title_el = block.select_one("div.pc-highlight-table-block__title span.pc-title-item__text")
        if title_el and _clean(title_el.get_text()) == table_title:
            target_block = block
            break

    if not target_block:
        titles = [
            _clean(t.get_text())
            for t in soup.select("div.pc-highlight-table-block__title span.pc-title-item__text")
        ]
        raise ValueError(
            f"Could not find table titled '{table_title}'. "
            f"Tables found: {titles or 'none'}"
        )

    # Extract header (optional validation / mapping)
    headers = [
        _clean(c.get_text(" ", strip=True))
        for c in target_block.select("div.pc-highlight-table-block__head div.pc-highlight-table-block__cell")
    ]
    # Expected: ["Item","vCPUs","RAM, GB","Price per GPU-hour"]
    # But we won't hard-fail if they tweak text slightly.

    rows: List[NebiusGpuRow] = []
    for r in target_block.select("div.pc-highlight-table-block__body div.pc-highlight-table-block__row"):
        cells = [_clean(c.get_text(" ", strip=True)) for c in r.select("div.pc-highlight-table-block__cell")]
        if len(cells) < 4:
            continue

        item, vcpus_str, ram_gb_str, price = cells[0], cells[1], cells[2], cells[3]

        # Basic sanity: ignore empty rows
        if not item or not price:
            continue

        # Parse values
        vram_gb = _extract_vram_from_product(item)
        vcpus = _extract_int(vcpus_str)
        system_ram_gb = _extract_int(ram_gb_str)
        price_per_hour_usd = _parse_float(price)

        rows.append(
            NebiusGpuRow(
                provider="nebius",
                product=item,
                vram_gb=vram_gb,
                vcpus=vcpus,
                system_ram_gb=system_ram_gb,
                price_per_hour_usd=price_per_hour_usd,
            )
        )

    if not rows:
        raise ValueError(
            f"Found '{table_title}' block but parsed 0 rows. "
            f"Headers seen: {headers}"
        )

    return rows


# ----------------------------
# Writers
# ----------------------------
def write_csv(path: str, rows: List[NebiusGpuRow]) -> None:
    fieldnames = ["provider", "product", "gpu_count", "vram_gb", "vcpus", "system_ram_gb", "local_storage_tb", "price_per_hour_usd"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))


def write_json(path: str, rows: List[NebiusGpuRow]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in rows], f, indent=2, ensure_ascii=False)


# ----------------------------
# CLI entrypoint (Lambda-style)
# ----------------------------
def scrape(url: str, out_csv: str, out_json: str, title: str = "NVIDIA GPU Instances"):
    """
    Scrape Nebius GPU pricing from URL and write to CSV/JSON files.
    
    Args:
        url: URL to scrape
        out_csv: Output CSV file path
        out_json: Output JSON file path
        title: Table title to scrape (default: "NVIDIA GPU Instances")
    """
    html = load_html_from_url(url)
    rows = parse_nebius_pricing(html, table_title=title)
    write_csv(out_csv, rows)
    write_json(out_json, rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", help="Path to HTML file (e.g., /mnt/data/nebius.html)")
    src.add_argument("--url", help="URL to scrape (live page)")
    ap.add_argument("--out-csv", default="nebius_gpu_prices.csv", help="Output CSV filename")
    ap.add_argument("--out-json", default="nebius_gpu_prices.json", help="Output JSON filename")
    ap.add_argument(
        "--title",
        default="NVIDIA GPU Instances",
        help="Which pricing table to scrape (matches the on-page table title)",
    )
    args = ap.parse_args()

    html = load_html_from_file(args.file) if args.file else load_html_from_url(args.url)
    rows = parse_nebius_pricing(html, table_title=args.title)

    write_csv(args.out_csv, rows)
    write_json(args.out_json, rows)

    print(f"Scraped {len(rows)} rows")
    print(f"Wrote: {args.out_csv}, {args.out_json}")


if __name__ == "__main__":
    main()