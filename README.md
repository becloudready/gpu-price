# GPU Cloud Pricing

**Compare GPU rental prices across neo cloud providers — updated nightly.**

A real-time dashboard for developers, AI engineers, and ML researchers who need to find the cheapest H100, A100, L40S, or B200 GPU instances for training, fine-tuning, or inference workloads. Browse pricing from AWS, Azure, GCP, Oracle, RunPod, Lambda Labs, Nebius, Crusoe and more in one place — no vendor lock-in, no sign-up required.

**Live:** [gpuprice.becloudready.com](https://gpuprice.becloudready.com)

---

## What it does

- **Nightly price scraping** 
- **Real-time comparison dashboard** 
- **Historical price charts** 
- **Multi-GPU comparison** 
- **Filters** 

### Data sources

Prices come from machine-readable sources, not HTML scraping. Each source is an independent job: if one fails, its last good data is kept and flagged `stale` in `meta.json`.

| Source | Providers |
|---|---|
| [dstack gpuhunt catalog](https://github.com/dstackai/gpuhunt) | AWS, Azure, GCP, Oracle, Lambda, RunPod, Nebius, Verda, CloudRift |
| Shadeform marketplace API | Crusoe, Denvr, Massed Compute, Paperspace, Hyperstack, Scaleway, Latitude and others |
| Akamai/Linode API | Linode |
| Vultr API | Vultr |
| [Lium public nodes feed](https://docs.lium.io/developers/public-nodes-feed) | Lium |

All prices are on-demand USD per GPU-hour (spot, reserved and fractional-GPU offers are excluded). Rows outside per-model sanity bounds are quarantined, not published.

---

## Repository layout

```
scraper/             Python scrapers + merge step (run nightly by GitHub Actions)
  sources/           one module per upstream source
  schema.py          normalized Offer schema, GPU naming, sanity bounds
  run_all.py         runs each job independently, with stale fallback
  merge.py           merges job files into all.json, all.csv, meta.json
tests/               pytest suite for the scraper
nextjs-dashboard/    Next.js frontend, deployed to Cloudflare Workers via OpenNext
.github/workflows/   nightly scrape and upload to R2
```

## Local development

### Scrapers (Python 3.11+)

```bash
pip install -r scraper/requirements.txt
python -m scraper.run_all --out-dir data --raw-dir raw
python -m scraper.merge --data-dir data
pip install -r scraper/requirements-dev.txt && python -m pytest tests
```

### Dashboard (Node.js 18+)

```bash
cd nextjs-dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## License

Apache 2.0
