#!/usr/bin/env python3
"""
Denvr GPU pricing scraper (Wix warmup JSON)

Usage:
  python denvr_scraper.py --file /mnt/data/denvr.html
  python denvr_scraper.py --url  "https://www.denvr.com/pricing"

Outputs:
  - denvr_gpu_prices.csv
  - denvr_gpu_prices.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup


# ----------------------------
# Data model
# ----------------------------
@dataclass
class DenvrGpuRow:
    provider: str = "denvr"
    product: str = ""
    gpu_count: Optional[int] = None
    vram_gb: Optional[float] = None
    vcpus: Optional[int] = None
    system_ram_gb: Optional[int] = None
    local_storage_tb: Optional[float] = None
    price_per_hour_usd: Optional[float] = None


# ----------------------------
# IO helpers
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
# Parser
# ----------------------------
def _parse_float(s: Optional[str]) -> Optional[float]:
    """Extract float from price string like '$1.25 / GPU'"""
    if not s:
        return None
    match = re.search(r'\$\s*(\d+(?:\.\d+)?)', s)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def _extract_vram_gb(vram_str: Optional[str]) -> Optional[float]:
    """Extract VRAM in GB from strings like '96 GB', '40 GB'"""
    if not vram_str:
        return None
    match = re.search(r'(\d+(?:\.\d+)?)\s*GB', vram_str)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def _extract_int(s: Optional[str]) -> Optional[int]:
    """Extract integer from strings like '160', '64'"""
    if not s:
        return None
    match = re.search(r'(\d+)', s)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None


def _extract_storage_tb(storage_str: Optional[str]) -> Optional[float]:
    """Extract storage in TB from strings like '4x 7.6TB NVMe'"""
    if not storage_str:
        return None
    match = re.search(r'(\d+(?:\.\d+)?)\s*TB', storage_str)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def _extract_wix_warmup_json(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find("script", id="wix-warmup-data")
    if not tag or not tag.string:
        raise ValueError("Could not find <script id='wix-warmup-data'> in HTML (is the page source complete?)")

    try:
        return json.loads(tag.string)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse wix-warmup-data JSON: {e}") from e


def parse_denvr_pricing(html: str) -> List[DenvrGpuRow]:
    warmup = _extract_wix_warmup_json(html)

    # Expected path (seen in your denvr.html):
    # appsWarmupData -> dataBinding -> dataStore -> recordsByCollectionId -> GPUInstances
    try:
        gpu_records = (
            warmup["appsWarmupData"]["dataBinding"]["dataStore"]["recordsByCollectionId"]["GPUInstances"]
        )
    except KeyError as e:
        raise ValueError(
            "Could not locate GPUInstances in warmup JSON at "
            "appsWarmupData.dataBinding.dataStore.recordsByCollectionId.GPUInstances"
        ) from e

    if not isinstance(gpu_records, dict) or not gpu_records:
        raise ValueError("GPUInstances collection found but empty.")

    rows: List[DenvrGpuRow] = []
    seen = set()

    for rec_id, rec in gpu_records.items():
        if not isinstance(rec, dict):
            continue

        title = rec.get("title") or ""
        if not title:
            continue

        price = rec.get("price") or ""
        
        # Extract values from fields
        gpu_count = rec.get("gpuCount")
        if gpu_count and not isinstance(gpu_count, int):
            gpu_count = _extract_int(str(gpu_count))

        vram_gb = _extract_vram_gb(rec.get("gpuVram"))
        vcpus = _extract_int(rec.get("vCpUs"))
        system_ram_gb = _extract_int(rec.get("memory"))
        local_storage_tb = _extract_storage_tb(rec.get("localStorage"))
        price_per_hour_usd = _parse_float(price)

        row = DenvrGpuRow(
            product=title,
            gpu_count=gpu_count,
            vram_gb=vram_gb,
            vcpus=vcpus,
            system_ram_gb=system_ram_gb,
            local_storage_tb=local_storage_tb,
            price_per_hour_usd=price_per_hour_usd,
        )

        # De-dupe: title+gpuCount+price is typically stable
        key = (title, gpu_count or 0, price)
        if key in seen:
            continue
        seen.add(key)

        rows.append(row)

    rows.sort(key=lambda r: (r.product, r.gpu_count or 0))
    return rows


# ----------------------------
# Writers
# ----------------------------
def write_csv(path: str, rows: List[DenvrGpuRow]) -> None:
    fieldnames = ["provider", "product", "gpu_count", "vram_gb", "vcpus", "system_ram_gb", "local_storage_tb", "price_per_hour_usd"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))


def write_json(path: str, rows: List[DenvrGpuRow]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in rows], f, indent=2, ensure_ascii=False)


# ----------------------------
# CLI entrypoint (Lambda-style)
# ----------------------------
def scrape(url: str, out_csv: str, out_json: str):
    """
    Scrape Denvr GPU pricing from URL and write to CSV/JSON files.
    
    Args:
        url: URL to scrape
        out_csv: Output CSV file path
        out_json: Output JSON file path
    """
    html = load_html_from_url(url)
    rows = parse_denvr_pricing(html)
    write_csv(out_csv, rows)
    write_json(out_json, rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", help="Path to HTML file (e.g., /mnt/data/denvr.html)")
    src.add_argument("--url", help="URL to scrape (live page)")
    ap.add_argument("--out-csv", default="denvr_gpu_prices.csv", help="Output CSV filename")
    ap.add_argument("--out-json", default="denvr_gpu_prices.json", help="Output JSON filename")
    args = ap.parse_args()

    html = load_html_from_file(args.file) if args.file else load_html_from_url(args.url)

    rows = parse_denvr_pricing(html)

    write_csv(args.out_csv, rows)
    write_json(args.out_json, rows)

    print(f"Scraped {len(rows)} rows")
    print(f"Wrote: {args.out_csv}, {args.out_json}")


if __name__ == "__main__":
    main()