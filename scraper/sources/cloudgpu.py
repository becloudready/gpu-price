"""CloudGPU official public JSON feed (no auth).

Reads https://cloudgpu.app/gpu-prices.json at scrape time. Prices are never
hard-coded. Rows with a missing name, non-positive GPU count, or missing
hourly USD figure are skipped. Unrecognized card names are left as the feed
wrote them (canonical_model already falls back to the raw string); this
module does not invent aliases.
"""

from scraper import http
from scraper.schema import Offer, canonical_model

URL = "https://cloudgpu.app/gpu-prices.json"
DEPLOY_URL = "https://cloudgpu.app/deploy"


def _availability(item: dict) -> str | None:
    stock = item.get("in_stock")
    if stock is True:
        return "in_stock"
    if stock is False:
        return "out_of_stock"
    return None


def parse(payload: dict) -> list[Offer]:
    offers: list[Offer] = []
    deploy_url = payload.get("deploy_page") or DEPLOY_URL
    for item in payload.get("gpus") or []:
        raw_name = (item.get("gpu") or "").strip()
        count = item.get("gpu_count")
        price = item.get("usd_per_hour")
        if not raw_name or not isinstance(count, int) or count < 1:
            continue
        if not isinstance(price, (int, float)):
            continue
        vram = item.get("vram_gb")
        model = canonical_model(raw_name, vram)
        region = item.get("region")
        if not isinstance(region, str) or not region.strip():
            region = None
        offers.append(Offer(
            provider="cloudgpu",
            instance_type=str(item.get("id") or raw_name),
            gpu_model=model,
            gpu_count=count,
            price_per_gpu_hour_usd=round(price / count, 4),
            instance_price_usd_per_hour=float(price),
            region=region,
            vram_gb=vram,
            deploy_url=deploy_url,
            source="cloudgpu-json",
            availability=_availability(item),
        ))
    return offers


def fetch(raw) -> list[Offer]:
    resp = http.get(URL)
    raw("cloudgpu.json", resp.content)
    return parse(resp.json())
