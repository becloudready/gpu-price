"""
`sources` package initializer.

This file exposes thin aliases for the scraper wrappers so callers can do:

    import sources.denvr
    import sources.runpod

Each module (denvr.py, runpod.py, etc.) implements `scrape(url, out_csv, out_json)`.
"""
from . import denvr
from . import runpod
from . import coreweave
from . import nebius
from . import crusoe
from . import lambdalabs

__all__ = ["denvr", "runpod", "coreweave", "nebius", "crusoe", "lambdalabs"]
