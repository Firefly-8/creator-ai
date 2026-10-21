#!/usr/bin/env python3
"""
安全地给 Cloudflare Pages 项目写入环境变量 / 密钥。

⚠️ 为什么需要这个脚本：
Cloudflare 的 GET 接口对 secret_text 类型的变量永远返回 value: ""（不回显明文）。
如果把 GET 的结果原样 PATCH 回去，就会把密钥的值写成空字符串——
密钥名还在，值没了，而且不会报错，很容易误判成"配置正常"。

正确做法：
  - 只提交「明确要改的键 + 真实值」
  - 想保留某个变量，就**完全不要把它放进请求体**（CF 会保留原值）
  - 只有显式传 null 才会删除某个变量

用法:
  python3 scripts/cf-set-secrets.py --project craftai-staging --env production \
      --set APP_SECRET=xxx --set MINIMAX_API_KEY=yyy

  # 从明文 key 生成加密 key（配合仓库 scripts/generate-keys.mjs 的算法）
  python3 scripts/cf-set-secrets.py --project craftai --env production \
      --master-key "$MASTER" --encrypt-from-plaintext MINIMAX_API_KEY="$KEY"
"""
import argparse
import json
import os
import sys
import time
import urllib.request

API = "https://api.cloudflare.com/client/v4"
TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT = "9fb668990196a42386f3544fa69d5b76"


def request(method, path, body=None, retries=8):
    data = json.dumps(body).encode() if body is not None else None
    last_err = None
    for attempt in range(retries):
        req = urllib.request.Request(
            API + path, data=data, method=method,
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            # 5xx 多为边缘节点瞬时抖动，退避重试
            if e.code < 500:
                raise
            last_err = e
            print(f"   … HTTP {e.code}，重试 {attempt + 1}/{retries}", file=sys.stderr)
            time.sleep(2 + attempt * 2)
        except Exception as e:  # 网络层抖动
            last_err = e
            print(f"   … {type(e).__name__}，重试 {attempt + 1}/{retries}", file=sys.stderr)
            time.sleep(2 + attempt * 2)
    raise last_err


def encrypt(plaintext: str, master_key: str) -> str:
    """用仓库自己的 crypto.ts 加密，保证与运行时 decrypt() 完全兼容。"""
    import subprocess
    here = os.path.dirname(os.path.abspath(__file__))
    out = subprocess.run(
        ["npx", "tsx", os.path.join(here, "encrypt-key.ts"), plaintext, master_key],
        capture_output=True, text=True, check=True, cwd=os.path.join(here, ".."),
    )
    data = json.loads(out.stdout)
    if not data.get("verified"):
        sys.exit("加密往返校验失败")
    return data["encrypted"]


def resolve_value(value: str) -> str:
    """支持 KEY=@ENVNAME 形式：从环境变量取值，避免密钥出现在命令行/历史里。"""
    if value.startswith("@"):
        name = value[1:]
        val = os.environ.get(name)
        if not val:
            sys.exit(f"环境变量 {name} 未设置")
        return val
    return value


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True, help="Pages 项目名，如 craftai / craftai-staging")
    ap.add_argument("--env", default="production", choices=["production", "preview"])
    ap.add_argument("--set", action="append", default=[], metavar="KEY=VALUE",
                    help="写入的变量，值非空；--set KEY= 删除该变量")
    ap.add_argument("--master-key", help="主密钥（用于 --encrypt-from-plaintext）")
    ap.add_argument("--encrypt-from-plaintext", action="append", default=[], metavar="TARGET=SOURCE",
                    help="把 SOURCE 变量按主密钥加密后写入 TARGET")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    updates: dict[str, dict] = {}
    for item in args.set:
        key, _, value = item.partition("=")
        if value == "":
            updates[key] = None  # 显式删除
        else:
            updates[key] = {"type": "secret_text", "value": resolve_value(value)}

    for item in args.encrypt_from_plaintext:
        target, _, source = item.partition("=")
        if not args.master_key:
            sys.exit("--encrypt-from-plaintext 需要 --master-key")
        plain = resolve_value("@" + source) if source.startswith("@") else (os.environ.get(source) or "")
        if not plain:
            sys.exit(f"找不到明文来源变量 {source}（用环境变量传入）")
        enc = encrypt(plain, args.master_key)
        updates[target] = {"type": "secret_text", "value": enc}
        print(f"已用主密钥加密 {source} → {target} ({len(enc)} 字符)")

    if not updates:
        sys.exit("没有要写入的变量")

    print(f"目标: {args.project} / {args.env}")
    print("将写入:")
    for k, v in updates.items():
        if v is None:
            print(f"  - {k}  (删除)")
        else:
            print(f"  + {k}  (secret_text, {len(v['value'])} 字符)")

    if args.dry_run:
        return

    # 关键：请求体里只放要改的键，绝不带上从 GET 读来的 value:""
    body = {"deployment_configs": {args.env: {"env_vars": updates}}}
    res = request("PATCH", f"/accounts/{ACCOUNT}/pages/projects/{args.project}", body)
    if not res.get("success"):
        print("❌ 写入失败:", json.dumps(res.get("errors"), ensure_ascii=False)[:400])
        sys.exit(1)

    now = res["result"]["deployment_configs"][args.env]["env_vars"]
    print("✅ 写入成功，当前变量清单:", ", ".join(sorted(now.keys())))
    print("   注意：变量值在下次部署时才会注入到 worker，需要重新部署才生效。")


if __name__ == "__main__":
    main()
