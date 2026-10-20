#!/usr/bin/env python3
"""
核对 Cloudflare Dashboard 上的绑定是否与仓库里的 wrangler.toml 一致。

CF Pages 的 Git 集成把仓库根目录的 wrangler.toml 当作 source of truth，
每次部署都会用文件里的绑定覆盖 Dashboard 上显示的值。所以 Dashboard 的
绑定字段其实是只读镜像——真正生效的是文件。

这个脚本是只读的：把 Dashboard 当前状态和仓库各分支的 wrangler.toml 对一遍，
在"文件没提交/没推"导致 Dashboard 与预期不一致时提前发现。

用法: python3 scripts/cf-bindings.py [project]
"""
import json
import os
import subprocess
import sys
import urllib.request

API = "https://api.cloudflare.com/client/v4"
TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT = "9fb668990196a42386f3544fa69d5b76"

# 分支 → (项目, 环境, 期望的 D1 id)
EXPECTED = {
    "master": ("craftai", "production", "bb60e6ae-597c-4cd7-a958-46942f5dffec"),
    "test": ("craftai-staging", "production", "8e812571-57b0-4232-bfc4-13264dc9e420"),
}


def request(path):
    req = urllib.request.Request(
        API + path, headers={"Authorization": f"Bearer {TOKEN}"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def branch_d1(ref):
    try:
        raw = subprocess.run(
            ["git", "show", f"{ref}:wrangler.toml"],
            capture_output=True, text=True, check=True,
        ).stdout
    except subprocess.CalledProcessError:
        return None
    for line in raw.splitlines():
        if line.strip().startswith("database_id"):
            return line.split("=", 1)[1].strip().strip('"')
    return None


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    print("=== Dashboard 绑定 vs 仓库 wrangler.toml ===\n")
    failed = False

    for branch, (project, env, expected_db) in EXPECTED.items():
        if only and only != project:
            continue
        cfg = request(f"/accounts/{ACCOUNT}/pages/projects/{project}")["result"]
        env_cfg = cfg["deployment_configs"][env]
        actual = (env_cfg.get("d1_databases") or {}).get("DB", {}).get("id")
        file_db = branch_d1(branch)
        hash_ = (env_cfg.get("wrangler_config_hash") or "")[:12]

        print(f"[{project} / {env}]  来自分支 {branch}")
        print(f"    Dashboard D1 : {actual or '未配置'}")
        print(f"    文件里的 D1  : {file_db or '未找到'}")
        print(f"    上次同步哈希 : {hash_ or 'null（未被文件覆盖过）'}")

        if actual != expected_db:
            print(f"    ❌ 与预期 {expected_db[:8]} 不符")
            failed = True
        elif file_db and file_db != actual:
            print(f"    ❌ 文件与 Dashboard 不一致 —— 可能是文件改了但没推")
            failed = True
        else:
            print("    ✅ 一致")
        print()

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
