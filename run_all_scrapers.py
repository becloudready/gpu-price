#!/usr/bin/env python3
"""
Wrapper script to run all GPU price scrapers serially.

Imports scraper modules from the `sources` package and calls their scrape() functions.
"""

import sys
from datetime import datetime
from pathlib import Path

# Import scraper modules
import sources.denvr
import sources.runpod
import sources.coreweave
import sources.nebius
import sources.crusoe
import sources.lambdalabs

sources.coreweave.scrape(url="https://www.coreweave.com/pricing", out_csv="data/coreweave_prices.csv", out_json="data/coreweave_prices.json")
sources.nebius.scrape(url="https://nebius.com/prices", out_csv="data/nebius_prices.csv", out_json="data/nebius_prices.json")
sources.denvr.scrape(url="https://www.denvr.com/pricing", out_csv="data/denvr_gpu_prices.csv", out_json="data/denvr_gpu_prices.json")
sources.runpod.scrape(url="https://runpod.io/pricing", out_csv="data/runpod_gpu_prices.csv", out_json="data/runpod_gpu_prices.json")
sources.crusoe.scrape(url="https://www.crusoe.ai/cloud/pricing", out_csv="data/crusoe_gpu_prices.csv", out_json="data/crusoe_gpu_prices.json")
sources.lambdalabs.scrape(url="https://lambda.ai/pricing", out_csv="data/lambda_gpu_prices.csv", out_json="data/lambda_gpu_prices.json")


