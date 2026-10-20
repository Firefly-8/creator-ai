#!/usr/bin/env python3
"""把 Google Fonts 可变字体实例化成静态 ttf，装进 fontconfig 供 sharp/librsvg 渲染。"""
import os, subprocess
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

BASE = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl"
JOBS = [
    ("playfairdisplay", "PlayfairDisplay", 400),
    ("playfairdisplay", "PlayfairDisplay", 600),
    ("playfairdisplay", "PlayfairDisplay", 700),
    ("caveat", "Caveat", 400),
    ("caveat", "Caveat", 600),
    ("lora", "Lora", 400),
    ("lora", "Lora", 600),
]
W = {400: "Regular", 600: "SemiBold", 700: "Bold"}
os.makedirs("/root/.fonts", exist_ok=True); os.makedirs("/tmp/fonts", exist_ok=True)

for fam, camel, wght in JOBS:
    var = f"/tmp/fonts/_var_{fam}.ttf"
    if not os.path.exists(var):
        url = f"{BASE}/{fam}/{camel}%5Bwght%5D.ttf"
        r = subprocess.run(["curl","-sL","--max-time","90","-o",var,url], capture_output=True)
        if r.returncode != 0 or not os.path.exists(var) or os.path.getsize(var) < 10000:
            print(f"  x 下载失败 {fam}"); continue
    out = f"/root/.fonts/{camel}-{W[wght]}.ttf"
    if os.path.exists(out):
        print(f"  - 已存在 {os.path.basename(out)}"); continue
    try:
        inst = instancer.instantiateVariableFont(TTFont(var), {"wght": wght}, updateFontNames=True)
        inst.save(out); print(f"  v {os.path.basename(out)} ({os.path.getsize(out)//1024}KB)")
    except Exception as e:
        print(f"  x {camel} {wght}: {e}")

subprocess.run(["fc-cache","-f"], capture_output=True)
print("-- fontconfig 可见 --")
out = subprocess.run(["fc-list",":","family"], capture_output=True, text=True).stdout
for line in sorted(set(out.splitlines())):
    if any(k in line.lower() for k in ("playfair","caveat","lora")): print("  ", line)
