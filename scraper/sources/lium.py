"""Lium public nodes feed (no auth), one row per rentable node. Price is per GPU, USD/hour.

Spot-tier nodes are reclaimable and skipped. Docs: https://docs.lium.io/developers/public-nodes-feed
"""

import re

from scraper import http
from scraper.schema import Offer, canonical_model

URL = "https://lium.io/api/public/v1/nodes"

# Form factor, memory and board-variant tokens in names like "H100 80GB HBM3" or "B300 SXM6 AC".
_NOISE = re.compile(r"\b(sxm\d?|pcie|hbm\d\w*|ac|pc|\d+\s*gb)\b", re.I)


def _model_name(raw: str) -> str:
    name = _NOISE.sub(" ", raw.replace("-", " "))
    return re.sub(r"^RTX A(\d)", r"A\1", " ".join(name.split()))


def parse(payload: dict) -> list[Offer]:
    offers = []
    for n in payload["nodes"]:
        count = n.get("gpu_count")
        if n.get("tier") == "spot" or not isinstance(count, int) or count < 1 or not n.get("price_per_gpu_hour"):
            continue
        vram = n.get("gpu_memory_gb")
        model = canonical_model(_model_name(n["gpu_model"]), vram)
        region = (n.get("country_code") or "").lower() or None
        offers.append(Offer(
            provider="lium",
            instance_type=f"{model} x{count}",
            gpu_model=model,
            gpu_count=count,
            price_per_gpu_hour_usd=n["price_per_gpu_hour"],
            instance_price_usd_per_hour=n.get("price_per_node_hour") or round(n["price_per_gpu_hour"] * count, 4),
            region=region,
            vram_gb=vram,
            vcpus=n.get("cpu_count"),
            system_ram_gb=n.get("ram_gb"),
            local_storage_tb=round(n["disk_gb"] / 1000, 3) if n.get("disk_gb") else None,
            deploy_url=n.get("rent_url") or "https://lium.io",
            source="lium-public-nodes",
            availability="in_stock" if n.get("available_gpu_count") else "out_of_stock",
        ))
    return offers


def fetch(raw) -> list[Offer]:
    resp = http.get(URL)
    raw("lium.json", resp.content)
    return parse(resp.json())
