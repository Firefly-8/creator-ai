#!/usr/bin/env python3
"""
i2i 一致性测试：同一张参考图 × N 种画风，看主体保不保得住、画风听不听话。

用法: python3 scripts/test-i2i-consistency.py <参考图路径> [模型]
"""
import base64
import json
import os
import sys
import time
import urllib.request

API = "https://api.minimaxi.com/v1/image_generation"
KEY = os.environ.get("MINIMAX_KEY") or os.environ.get("MINIMAX_API_KEY")
OUT = sys.argv[2] if len(sys.argv) > 2 else "/workspace/output/i2i-test"

STYLES = [
    ("watercolor", "watercolor painting, soft wet brush strokes, visible paper texture, pastel colors, hand painted illustration"),
    ("anime", "anime style illustration, cel shading, clean line art, vibrant flat colors, studio anime film look"),
    ("oil-painting", "oil painting on canvas, thick impasto brush strokes, rich oil colors, museum fine art portrait"),
    ("pixel-art", "pixel art, 32x32 retro game sprite, limited color palette, crisp pixel edges"),
]


def post(payload):
    req = urllib.request.Request(
        API, data=json.dumps(payload).encode(), method="POST",
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())


def main():
    ref_path = sys.argv[1]
    model = "image-01-live"
    data = open(ref_path, "rb").read()
    uri = "data:image/jpeg;base64," + base64.b64encode(data).decode()
    os.makedirs(OUT, exist_ok=True)

    results = []
    for name, style in STYLES:
        payload = {
            "model": model,
            "prompt": f"A portrait of the same dog from the reference photo, {style}",
            "aspect_ratio": "1:1",
            "n": 1,
            "response_format": "url",
            "prompt_optimizer": False,   # 关掉优化器，避免它稀释风格词
            "subject_reference": [{"type": "character", "image_file": uri}],
        }
        t0 = time.time()
        try:
            d = post(payload)
            code = (d.get("base_resp") or {}).get("status_code")
            urls = (d.get("data") or {}).get("image_urls") or []
            if code == 0 and urls:
                path = os.path.join(OUT, f"style_{name}.jpg")
                with urllib.request.urlopen(urls[0], timeout=120) as ir, open(path, "wb") as f:
                    f.write(ir.read())
                print(f"  ✅ {name:<14} {time.time()-t0:5.1f}s  → {path}")
                results.append({"style": name, "ok": True, "path": path, "seconds": round(time.time()-t0, 1)})
            else:
                print(f"  ❌ {name:<14} code={code} {json.dumps(d.get('base_resp'), ensure_ascii=False)}")
                results.append({"style": name, "ok": False, "error": json.dumps(d.get("base_resp"))[:200]})
        except Exception as e:
            print(f"  ❌ {name:<14} {type(e).__name__}: {e}")
            results.append({"style": name, "ok": False, "error": str(e)[:200]})

    with open(os.path.join(OUT, "consistency-report.json"), "w") as f:
        json.dump({"model": model, "reference": ref_path, "results": results}, f, indent=2)
    print(f"\n报告: {os.path.join(OUT, 'consistency-report.json')}")


if __name__ == "__main__":
    main()
