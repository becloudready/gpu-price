#!/usr/bin/env python3
"""
RunPod GPU Pricing Scraper

Usage:
  python runpod_scraper.py --file /path/to/runpod.html
  python runpod_scraper.py --url https://www.runpod.io/pricing

Outputs:
  - runpod_gpu_prices.csv
  - runpod_gpu_prices.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup


# ----------------------------
# IO helpers
# ----------------------------
def load_html_from_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def load_html_from_url(url: str, timeout_s: int = 30) -> str:
    req = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            )
        },
    )
    with urlopen(req, timeout=timeout_s) as resp:
        return resp.read().decode("utf-8", errors="ignore")


# ----------------------------
# Parsing helpers
# ----------------------------
_NUM_RE = re.compile(r"[-+]?\d*\.?\d+")


def _to_float(x: Optional[str]) -> Optional[float]:
    if x is None:
        return None
    x = x.strip()
    if not x:
        return None
    m = _NUM_RE.search(x)
    if not m:
        return None
    try:
        return float(m.group(0))
    except ValueError:
        return None


def _clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _parse_tags(tag_divs) -> Dict[str, str]:
    """
    RunPod rows tend to have tags like:
      [ "80", "GB VRAM" ], [ "240", "GB RAM" ], [ "24", "vCPUs" ]
    We turn those into a dict like:
      { "GB VRAM": "80", "GB RAM": "240", "vCPUs": "24" }
    """
    out: Dict[str, str] = {}
    for t in tag_divs:
        parts = [_clean_text(x.get_text(" ", strip=True)) for x in t.select("div")]
        parts = [p for p in parts if p]
        if len(parts) >= 2:
            value = parts[0]
            label = parts[1]
            out[label] = value
        elif len(parts) == 1:
            # If the structure changes, keep raw
            out[f"tag_{len(out)+1}"] = parts[0]
    return out


def _extract_normalized_fields(tags: Dict[str, str]) -> Dict[str, Any]:
    """
    Normalize common fields when present.
    """
    norm: Dict[str, Any] = {"vram_gb": None, "ram_gb": None, "vcpus": None}

    for k, v in tags.items():
        k_norm = k.lower()
        if "vram" in k_norm and "gb" in k_norm:
            norm["vram_gb"] = _to_float(v)
        elif "ram" in k_norm and "gb" in k_norm:
            norm["ram_gb"] = _to_float(v)
        elif "vcpus" in k_norm or "vcpu" in k_norm:
            norm["vcpus"] = _to_float(v)

    return norm


@dataclass
class RunPodGpuRow:
    provider: str = "runpod"
    product: str = ""
    gpu_count: Optional[int] = None
    vram_gb: Optional[float] = None
    vcpus: Optional[int] = None
    system_ram_gb: Optional[float] = None
    local_storage_tb: Optional[float] = None
    price_per_hour_usd: Optional[float] = None


def parse_runpod_pricing(html: str) -> List[RunPodGpuRow]:
    soup = BeautifulSoup(html, "html.parser")

    rows: List[RunPodGpuRow] = []

    # Each GPU row is an <a class="gpu-pricing-row ...">
    for a in soup.select("a.gpu-pricing-row"):
        model_el = a.select_one(".gpu-pricing-row__model-wrapper")
        gpu_model = _clean_text(model_el.get_text(" ", strip=True)) if model_el else ""
        if not gpu_model:
            continue

        # Tags like VRAM/RAM/vCPUs
        tag_divs = a.select(".gpu-pricing-row__tag")
        tags = _parse_tags(tag_divs)
        norm = _extract_normalized_fields(tags)

        # Price element has attributes for both price modes (use secure_price if available, else community)
        price_el = a.select_one(".cc-gpu-price")
        secure_price = _to_float(price_el.get("data-secure-cloud-price")) if price_el else None
        community_price = _to_float(price_el.get("data-community-cloud-price")) if price_el else None
        price_per_hour_usd = secure_price or community_price  # Prefer secure pricing

        # Extract vCPUs as integer
        vcpus = None
        if norm["vcpus"] is not None:
            vcpus = int(norm["vcpus"])

        rows.append(
            RunPodGpuRow(
                product=gpu_model,
                vram_gb=norm["vram_gb"],
                system_ram_gb=int(norm["ram_gb"]) if norm["ram_gb"] else None,
                vcpus=vcpus,
                price_per_hour_usd=price_per_hour_usd,
            )
        )

    if not rows:
        raise ValueError(
            "No RunPod GPU rows found. The page structure may have changed or the HTML is incomplete."
        )

    return rows


# ----------------------------
# Writers
# ----------------------------
def write_json(path: str, rows: List[RunPodGpuRow]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in rows], f, indent=2, ensure_ascii=False)


def write_csv(path: str, rows: List[RunPodGpuRow]) -> None:
    fieldnames = ["provider", "product", "gpu_count", "vram_gb", "vcpus", "system_ram_gb", "local_storage_tb", "price_per_hour_usd"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))


# ----------------------------
# CLI
# ----------------------------
def scrape(url: str, out_csv: str, out_json: str):
    """
    Scrape RunPod GPU pricing from URL and write to CSV/JSON files.
    
    Args:
        url: URL to scrape
        out_csv: Output CSV file path
        out_json: Output JSON file path
    """
    html = load_html_from_url(url)
    rows = parse_runpod_pricing(html)
    write_csv(out_csv, rows)
    write_json(out_json, rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", help="Path to HTML file (e.g., /mnt/data/runpod.html)")
    src.add_argument("--url", help="URL to scrape (live page)")
    ap.add_argument("--out-csv", default="runpod_gpu_prices.csv", help="Output CSV filename")
    ap.add_argument("--out-json", default="runpod_gpu_prices.json", help="Output JSON filename")
    args = ap.parse_args()

    html = load_html_from_file(args.file) if args.file else load_html_from_url(args.url)

    rows = parse_runpod_pricing(html)

    write_csv(args.out_csv, rows)
    write_json(args.out_json, rows)

    print(f"Wrote {len(rows)} rows -> {args.out_csv}, {args.out_json}")


if __name__ == "__main__":
    main()