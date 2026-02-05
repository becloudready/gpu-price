#!/usr/bin/env python3
"""
Scrape GPU prices from Crusoe pricing HTML (local file or live URL).

Usage:
  python scrape_crusoe_prices.py --file /mnt/data/cruso.html
  python scrape_crusoe_prices.py --url  "https://www.crusoe.ai/cloud/pricing"
"""

import argparse
import csv
import json
import re
from dataclasses import asdict, dataclass
from typing import List, Optional

import requests
from bs4 import BeautifulSoup


@dataclass
class GpuPriceRow:
    provider: str
    product: str
    gpu_count: Optional[int] = None
    vram_gb: Optional[int] = None
    vcpus: Optional[int] = None
    system_ram_gb: Optional[int] = None
    local_storage_tb: Optional[float] = None
    price_per_hour_usd: Optional[float] = None


def _clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def load_html_from_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def load_html_from_url(url: str, timeout: int = 30) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; price-scraper/1.0; +https://example.com/bot)"
    }
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    return r.text


def parse_gpu_prices(html: str, base_url: Optional[str] = None) -> List[GpuPriceRow]:
    soup = BeautifulSoup(html, "html.parser")

    rows: List[GpuPriceRow] = []

    # Each GPU card looks like: <div class="pricing_gpu-item"> ... </div>
    for card in soup.select("div.pricing_gpu-item"):
        name_el = card.select_one("h4.pricing-item-heading")
        gpu_name = _clean_text(name_el.get_text()) if name_el else None
        if not gpu_name:
            continue

        # Extract VRAM from tags if available
        vram_gb = None
        tags = [_clean_text(t.get_text()) for t in card.select(".pricing_tags-wr .pricing-tag") if _clean_text(t.get_text())]
        for tag in tags:
            # Try to extract GB values like "186GB", "141GB"
            match = re.search(r'(\d+(?:\.\d+)?)\s*GB', tag)
            if match:
                vram_gb = int(float(match.group(1)))
                break

        # Extract price (first numeric price found)
        price_per_hour_usd = None
        for p in card.select("div.pricing-rich p"):
            txt = _clean_text(p.get_text())
            if txt:
                price_match = re.search(r'\$\s*(\d+(?:\.\d+)?)', txt)
                if price_match:
                    price_per_hour_usd = float(price_match.group(1))
                    break

        rows.append(GpuPriceRow(
            provider="crusoe",
            product=gpu_name,
            vram_gb=vram_gb,
            price_per_hour_usd=price_per_hour_usd,
        ))

    return rows


def write_csv(rows: List[GpuPriceRow], path: str) -> None:
    fieldnames = ["provider", "product", "gpu_count", "vram_gb", "vcpus", "system_ram_gb", "local_storage_tb", "price_per_hour_usd"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))


def main() -> None:
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", help="Path to HTML file (e.g., /mnt/data/cruso.html)")
    src.add_argument("--url", help="URL to scrape (live page)")
    ap.add_argument("--base-url", help="Base URL for resolving relative links (only needed with --file)")
    ap.add_argument("--out-csv", default="gpu_prices.csv", help="Output CSV filename")
    ap.add_argument("--out-json", default="gpu_prices.json", help="Output JSON filename")
    args = ap.parse_args()

    if args.file:
        html = load_html_from_file(args.file)
        base_url = args.base_url
    else:
        html = load_html_from_url(args.url)
        base_url = args.url.split("/cloud/")[0] if "/cloud/" in args.url else None

    rows = parse_gpu_prices(html, base_url=base_url)

    write_csv(rows, args.out_csv)
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in rows], f, indent=2)

    print(f"Scraped {len(rows)} GPU rows")
    print(f"Wrote: {args.out_csv}, {args.out_json}")


def scrape(url: str, out_csv: str, out_json: str):
    """
    Scrape Crusoe GPU pricing from URL and write to CSV/JSON files.
    
    Args:
        url: URL to scrape
        out_csv: Output CSV file path
        out_json: Output JSON file path
    """
    html = load_html_from_url(url)
    base_url = url.split("/cloud/")[0] if "/cloud/" in url else None
    rows = parse_gpu_prices(html, base_url=base_url)
    write_csv(rows, out_csv)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in rows], f, indent=2)


if __name__ == "__main__":
    main()