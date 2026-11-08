"""Runcrate public price feed (no auth). One row per GPU type, USD per GPU-hour.

`min_price_hr` is the lowest on-demand per-GPU price across the type's live offers and
`available_options` is how many are live; a type with none is skipped (the feed can keep
a stale price for an out-of-stock type). Types the dashboard has no canonical name for
(for example `H200_nvl` or Gaudi) are skipped rather than published under a raw id.
"""

import re

from scraper import http
from scraper.schema import _MODELS, Offer, canonical_model

URL = "https://www.runcrate.ai/api/gpu-pricing"
DEPLOY_URL = "https://www.runcrate.ai/pricing?utm_source=becloudready&utm_medium=directory&utm_campaign=gpu_pricing"
_KNOWN = set(_MODELS.values())


def _vram_gb(raw) -> float | None:
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*GB", str(raw or "").strip(), re.I)
    return float(m.group(1)) if m else None


def parse(payload: dict) -> list[Offer]:
    offers = []
    for g in payload["gpus"]:
        price = float(g.get("min_price_hr") or 0)
        if price <= 0 or not g.get("available_options"):
            continue
        vram = _vram_gb(g.get("vram"))
        model = canonical_model(g["gpu_type"], vram)
        if model not in _KNOWN and not re.fullmatch(r"(A100|V100) \d+GB", model):
            continue
        offers.append(Offer(
            provider="runcrate",
            instance_type=g["gpu_type"],
            gpu_model=model,
            gpu_count=1,
            price_per_gpu_hour_usd=round(price, 4),
            instance_price_usd_per_hour=price,
            vram_gb=vram,
            deploy_url=DEPLOY_URL,
            source="runcrate-api",
            availability="in_stock",
        ))
    return offers


def fetch(raw) -> list[Offer]:
    resp = http.get(URL)
    raw("runcrate.json", resp.content)
    return parse(resp.json())
