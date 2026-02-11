#!/usr/bin/env python3
"""
Scrape GPU pricing tables from Lambda pricing HTML (local file or live URL).

Usage:
  python scrape_lambda_prices.py --file /mnt/data/lambda.html
  python scrape_lambda_prices.py --url  "https://lambda.ai/pricing"
"""

import argparse
import csv
import json
import re
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional

import requests
from bs4 import BeautifulSoup


@dataclass
class PricingRow:
    provider: str = "lambda"
    product: str = ""
    gpu_count: Optional[int] = None
    vram_gb: Optional[float] = None
    vcpus: Optional[int] = None
    system_ram_gb: Optional[int] = None
    local_storage_tb: Optional[float] = None
    price_per_hour_usd: Optional[float] = None


def _parse_float(s: Optional[str]) -> Optional[float]:
    """Extract float from price string like '$3.79' or '3.79'"""
    if not s:
        return None
    match = re.search(r'[-+]?\d*\.?\d+', s)
    if match:
        try:
            return float(match.group(0))
        except ValueError:
            return None
    return None


def _extract_vram_gb(s: Optional[str]) -> Optional[float]:
    """Extract VRAM from strings like '141 GB VRAM'"""
    if not s:
        return None
    match = re.search(r'(\d+(?:\.\d+)?)\s*GB', s)
    if match:
        try:
            return float(match.group(1))
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


def _extract_normalized_fields(plan_text: Optional[str], fields: Dict[str, str]) -> tuple:
    """
    Extract normalized fields from Lambda pricing table.
    Returns: (product, gpu_count, vram_gb, vcpus, system_ram_gb, price_per_hour_usd)
    """
    # Product is typically from the plan name (e.g., "NVIDIA HGX B200", "NVIDIA H100 SXM")
    product = plan_text or "Unknown"
    
    gpu_count = None
    vram_gb = None
    vcpus = None
    system_ram_gb = None
    price_per_hour_usd = None

    # Try to extract from fields dict
    for key, val in fields.items():
        key_lower = key.lower()
        
        # Price field (look for anything with "price" or "$")
        if ("price" in key_lower or "cost" in key_lower) and price_per_hour_usd is None:
            price_per_hour_usd = _parse_float(val)
        
        # VRAM field
        elif ("vram" in key_lower or "memory" in key_lower) and vram_gb is None and "gb" in val.lower():
            vram_gb = _extract_vram_gb(val)
        
        # vCPU field
        elif ("vcpu" in key_lower or "cpu" in key_lower) and vcpus is None:
            vcpus = _extract_int(val)
        
        # GPU count field
        elif ("gpu" in key_lower and "count" in key_lower) and gpu_count is None:
            gpu_count = _extract_int(val)

    return product, gpu_count, vram_gb, vcpus, system_ram_gb, price_per_hour_usd


def load_html_from_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def load_html_from_url(url: str, timeout: int = 30) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; price-scraper/1.0)"}
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    return r.text


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _nearest_section_title(node) -> str:
    """
    Walk up to find the closest preceding/ancestor H2 that names the pricing section
    (e.g., 'Instances pricing', '1-Click Clusters pricing').
    """
    # Try within the same section first
    sec = node.find_parent("section")
    if sec:
        h2 = sec.select_one("h2")
        if h2 and _clean(h2.get_text()):
            return _clean(h2.get_text())

    # Fallback: scan backwards in the document for the last h2 before this table
    for prev in node.find_all_previous(["h2"]):
        txt = _clean(prev.get_text())
        if txt:
            return txt

    return "Pricing"


def _tab_label_for_table(table) -> Optional[str]:
    """
    Lambda page uses tab panels with aria-labelledby="tab-X". We can map that to button text.
    """
    panel = table.find_parent(attrs={"role": "tabpanel"})
    if not panel:
        return None

    labelledby = panel.get("aria-labelledby")
    if not labelledby:
        return None

    soup = table if isinstance(table, BeautifulSoup) else table.find_parent()
    # "soup" may not be root; use the document root for lookup
    root = table.find_parent("html") or table.find_parent() or table
    btn = root.find(id=labelledby)
    if btn:
        t = _clean(btn.get_text())
        return t or None
    return None


def parse_lambda_pricing(html: str) -> List[PricingRow]:
    soup = BeautifulSoup(html, "html.parser")
    rows: List[PricingRow] = []

    # Lambda tables in the saved HTML are rendered as <table class="_pricingTable_z1nfw_13">
    for table in soup.select("table._pricingTable_z1nfw_13"):
        section_title = _nearest_section_title(table)
        tab_label = _tab_label_for_table(table)

        # Extract header names in order (helps when data-label is missing)
        headers = []
        for th in table.select("thead th"):
            headers.append(_clean(th.get_text()))

        for tr in table.select("tbody tr"):
            # Each row has a "plan" in the first TH (often duplicated by data-plan attr)
            plan_text = None
            th0 = tr.find("th")
            if th0:
                plan_text = _clean(th0.get_text()) or None
            if not plan_text:
                plan_text = tr.get("data-plan")

            fields: Dict[str, str] = {}

            # Prefer data-label attributes (these are present in Lambda tables)
            # Collect cells from both <th> and <td> in body rows
            body_cells = tr.find_all(["th", "td"])
            for idx, cell in enumerate(body_cells):
                key = cell.get("data-label")
                val = _clean(cell.get_text())

                # If no data-label, fall back to column header index (if possible)
                if not key:
                    if idx < len(headers) and headers[idx]:
                        key = headers[idx]
                    else:
                        key = f"col_{idx}"

                # Avoid overwriting if repeated
                if key in fields and fields[key] != val:
                    fields[f"{key}_{idx}"] = val
                else:
                    fields[key] = val

            # Extract normalized fields
            product, gpu_count, vram_gb, vcpus, system_ram_gb, price_per_hour_usd = _extract_normalized_fields(plan_text, fields)

            rows.append(
                PricingRow(
                    product=product,
                    gpu_count=gpu_count,
                    vram_gb=vram_gb,
                    vcpus=vcpus,
                    system_ram_gb=system_ram_gb,
                    price_per_hour_usd=price_per_hour_usd,
                )
            )

    return rows


def write_csv(rows: List[PricingRow], path: str) -> None:
    """
    Write pricing rows to standardized CSV format.
    """
    fieldnames = ["provider", "product", "gpu_count", "vram_gb", "vcpus", "system_ram_gb", "local_storage_tb", "price_per_hour_usd"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))


def scrape(url: str, out_csv: str, out_json: str):
    """
    Scrape Lambda GPU pricing from URL and write to CSV/JSON files.
    
    Args:
        url: URL to scrape
        out_csv: Output CSV file path
        out_json: Output JSON file path
    """
    html = load_html_from_url(url)
    rows = parse_lambda_pricing(html)
    write_csv(rows, out_csv)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in rows], f, indent=2, ensure_ascii=False)


def main() -> None:
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", help="Path to HTML file (e.g., /mnt/data/lambda.html)")
    src.add_argument("--url", help="URL to scrape (live page)")
    ap.add_argument("--out-csv", default="lambda_gpu_prices.csv", help="Output CSV filename")
    ap.add_argument("--out-json", default="lambda_gpu_prices.json", help="Output JSON filename")
    args = ap.parse_args()

    html = load_html_from_file(args.file) if args.file else load_html_from_url(args.url)

    rows = parse_lambda_pricing(html)

    write_csv(rows, args.out_csv)
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in rows], f, indent=2, ensure_ascii=False)

    print(f"Scraped {len(rows)} rows")
    print(f"Wrote: {args.out_csv}, {args.out_json}")


if __name__ == "__main__":
    main()