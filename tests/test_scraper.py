import json

from scraper import merge  # noqa: F401  (import check)
from scraper.schema import Offer, canonical_model, collapse_regions, drop_fractional, in_bounds
from scraper.sources import gpuhunt, linode, lium, shadeform, vultr

CSV_HEAD = "instance_name,location,price,cpu,memory,gpu_count,gpu_name,gpu_memory,spot,disk_size,gpu_vendor,flags,cpu_arch,provider_data\n"


def offer(**kw):
    base = dict(provider="p", instance_type="i", gpu_model="H100", gpu_count=1,
                price_per_gpu_hour_usd=2.0, instance_price_usd_per_hour=2.0, region="r", regions={"r": 2.0})
    base.update(kw)
    return Offer(**base)


def test_canonical_model():
    assert canonical_model("A100", 80) == "A100 80GB"
    assert canonical_model("A100_80G") == "A100 80GB"
    assert canonical_model("A100", 40) == "A100 40GB"
    assert canonical_model("NVIDIA_L40S") == "L40S"
    assert canonical_model("H100NVL") == "H100 NVL"


def test_bounds():
    assert in_bounds("H100", 2.5)
    assert not in_bounds("H100", 0.1)
    assert not in_bounds("H100", 25)


def test_gpuhunt_per_gpu_price_skips_spot_and_cpu():
    text = CSV_HEAD + (
        "p5.48xlarge,us-east-1,40.0,192,2048,8,H100,80,False,,nvidia,,x86,{}\n"
        "p5.48xlarge,eu-west-2,60.0,192,2048,8,H100,80,False,,nvidia,,x86,{}\n"
        "p5.48xlarge,us-west-2,10.0,192,2048,8,H100,80,True,,nvidia,,x86,{}\n"
        "t3.nano,us-east-1,0.01,2,0.5,0,,,False,,,,x86,{}\n"
        "v5p-8,us-east5,9.0,1,1,8,v5p-8,,False,,google,,x86,{}\n"
    )
    offers = collapse_regions(gpuhunt.parse("aws", text))
    assert len(offers) == 1
    o = offers[0]
    assert o.price_per_gpu_hour_usd == 5.0 and o.region == "us-east-1"
    assert o.regions == {"eu-west-2": 7.5, "us-east-1": 5.0}


def test_fractional_gpus_dropped():
    rows = [offer(gpu_model="A10", vram_gb=24), offer(gpu_model="A10", vram_gb=4, instance_type="slice")]
    assert [o.instance_type for o in drop_fractional(rows)] == ["i"]


def test_shadeform_cents_and_covered_provider_skipped():
    def t(cloud, price):
        return {"cloud": cloud, "shade_instance_type": "X", "hourly_price": price, "configuration": {
            "num_gpus": 8, "gpu_type": "H100", "vram_per_gpu_in_gb": 80, "vcpus": 8, "memory_in_gb": 8, "storage_in_gb": 1000},
            "availability": [{"region": "us", "available": True}]}
    offers = shadeform.parse({"instance_types": [t("crusoe", 1600), t("lambdalabs", 1600)]})
    assert [(o.provider, o.price_per_gpu_hour_usd) for o in offers] == [("crusoe", 2.0)]


def test_shadeform_keeps_out_of_stock_and_flags_availability():
    def t(cloud, slots):
        return {"cloud": cloud, "shade_instance_type": "X", "hourly_price": 1600, "configuration": {
            "num_gpus": 8, "gpu_type": "H100", "vram_per_gpu_in_gb": 80, "vcpus": 8, "memory_in_gb": 8, "storage_in_gb": 1000},
            "availability": [{"region": r, "available": a} for r, a in slots]}
    offers = shadeform.parse({"instance_types": [
        t("crusoe", [("us", True), ("eu", False)]),
        t("voltagepark", [("us", False)]),
    ]})
    by = {o.provider: o for o in offers}
    assert by["crusoe"].availability == "in_stock" and set(by["crusoe"].regions) == {"us"}
    assert by["voltagepark"].availability == "out_of_stock" and by["voltagepark"].price_per_gpu_hour_usd == 2.0


def test_linode_and_vultr():
    lin = linode.parse({"data": [{"id": "g", "label": "RTX4000 Ada x2 Small", "class": "gpu", "gpus": 2,
                                  "price": {"hourly": 1.0}, "vcpus": 8, "memory": 32768, "disk": 1048576}]})
    assert lin[0].price_per_gpu_hour_usd == 0.5 and lin[0].gpu_model == "RTX 4000 Ada" and lin[0].vram_gb == 20
    plans = {"plans": [
        {"id": "a", "hourly_cost": 0.06, "gpu_count": "1/8", "gpu_type": "NVIDIA_A16", "gpu_vram_gb": 2, "vcpu_count": 2, "ram": 8192, "disk": 50},
        {"id": "b", "hourly_cost": 3.0, "gpu_count": 2, "gpu_type": "NVIDIA_L40S", "gpu_vram_gb": 96, "vcpu_count": 32, "ram": 375000, "disk": 1000},
    ]}
    v = vultr.parse(plans)
    assert len(v) == 1 and v[0].price_per_gpu_hour_usd == 1.5 and v[0].vram_gb == 48


def test_lium_skips_spot_and_normalizes_names():
    node = {"gpu_count": 8, "price_per_gpu_hour": 2.0, "price_per_node_hour": 16.0, "available_gpu_count": 8,
            "gpu_memory_gb": 80, "cpu_count": 128, "ram_gb": 2015, "disk_gb": 7000, "tier": "secure",
            "country_code": "US", "rent_url": "https://lium.io/browse-pods/x"}
    rows = lium.parse({"nodes": [
        {**node, "gpu_model": "H100 80GB HBM3"},
        {**node, "gpu_model": "A100-SXM4-80GB"},
        {**node, "gpu_model": "B300 SXM6 PC", "gpu_memory_gb": 268},
        {**node, "gpu_model": "RTX A6000", "gpu_memory_gb": 48},
        {**node, "gpu_model": "RTX 4090", "tier": "spot"},
    ]})
    assert [r.gpu_model for r in rows] == ["H100", "A100 80GB", "B300", "A6000"]
    assert rows[0].instance_price_usd_per_hour == 16.0 and rows[0].region == "us" and rows[0].availability == "in_stock"


def test_run_job_failure_keeps_previous(tmp_path, monkeypatch):
    from scraper import run_all
    prev = tmp_path / "prev"; prev.mkdir()
    (prev / "boom.json").write_text(json.dumps({"last_success": "T", "rows": [{"x": 1}]}))
    def fail(raw): raise RuntimeError("down")
    monkeypatch.setattr(run_all, "JOBS", {"boom": (fail, 1)})
    monkeypatch.setattr("sys.argv", ["x", "--out-dir", str(tmp_path / "d"), "--raw-dir", str(tmp_path / "r"), "--previous-dir", str(prev), "--strict"])
    assert run_all.main() == 1
    res = json.loads((tmp_path / "d" / "jobs" / "boom.json").read_text())
    assert res["stale"] and res["last_success"] == "T" and res["rows"] == [{"x": 1}] and "down" in res["error"]
