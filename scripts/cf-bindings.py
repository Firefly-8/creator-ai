#!/usr/bin/env python3
"""
为 Cloudflare Pages 的 4 个环境配齐绑定（生产库 / 预发布库分离）。

背景：仓库根目录的 wrangler.toml 会被 CF Pages 当作 source of truth，
每次部署都用文件里的绑定覆盖 Dashboard 配置。根目录文件只保留一份，
无法同时表达"生产用 craftai-db、预发布用 craftai-db-staging"，
因此改为由 Dashboard 侧配置，并通过移除文件中的 pages_build_output_dir
让 CF 忽略该文件。

用法: python3 scripts/cf-bindings.py <apply|dump>
"""
import json
import os
import sys
import urllib.request

API = "https://api.cloudflare.com/client/v4"
TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT = "9fb668990196a42386f3544fa69d5b76"

PROD_DB = "bb60e6ae-597c-4cd7-a958-46942f5dffec"      # craftai-db
STAGING_DB = "8e812571-57b0-4232-bfc4-13264dc9e420"  # craftai-db-staging
PROD_KV = "910cd6d2350548e2a662098ca1e910ba"
STAGING_KV = "4ebb1e030d274e2dbf35ab559d602649"
R2_BUCKET = "craftai-storage"

# project -> {env: (d1_id, kv_id)}
TARGET = {
    "craftai": {
        "production": (PROD_DB, PROD_KV),
        "preview": (STAGING_DB, STAGING_KV),
    },
    "craftai-staging": {
        "production": (STAGING_DB, STAGING_KV),
        "preview": (STAGING_DB, STAGING_KV),
    },
}


def request(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def build_env(existing, d1_id, kv_id):
    """在保留原有 env_vars 等设置的前提下，写入绑定。"""
    env = dict(existing or {})
    env["d1_databases"] = {"DB": {"id": d1_id}}
    kv = {"CACHE": {"namespace_id": kv_id}}
    if "C1" in (existing or {}).get("kv_namespaces", {}):
        kv["C1"] = {"namespace_id": kv_id}
    env["kv_namespaces"] = kv
    env["r2_buckets"] = {"STORAGE": {"name": R2_BUCKET}}
    return env


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "dump"

    for project, envs in TARGET.items():
        current = request("GET", f"/accounts/{ACCOUNT}/pages/projects/{project}")["result"]
        cfg = current["deployment_configs"]
        new_prod = build_env(cfg.get("production"), *envs["production"])
        new_prev = build_env(cfg.get("preview"), *envs["preview"])

        if mode == "dump":
            print(f"[{project}]")
            print(f"  production: d1={new_prod['d1_databases']['DB']['id']} "
                  f"kv={list(new_prod['kv_namespaces'])} r2={list(new_prod['r2_buckets'])}")
            print(f"  preview   : d1={new_prev['d1_databases']['DB']['id']} "
                  f"kv={list(new_prev['kv_namespaces'])} r2={list(new_prev['r2_buckets'])}")
            continue

        body = {"deployment_configs": {"production": new_prod, "preview": new_prev}}
        res = request("PATCH", f"/accounts/{ACCOUNT}/pages/projects/{project}", body)
        ok = res.get("success")
        print(f"[{project}] PATCH -> {'✅' if ok else '❌ ' + json.dumps(res.get('errors'))[:300]}")
        if ok:
            d = res["result"]["deployment_configs"]
            for env_name in ("production", "preview"):
                print(f"    {env_name:11} d1={d[env_name]['d1_databases']['DB']['id']} "
                      f"kv={list(d[env_name]['kv_namespaces'])} r2={list(d[env_name]['r2_buckets'])}")


if __name__ == "__main__":
    main()
