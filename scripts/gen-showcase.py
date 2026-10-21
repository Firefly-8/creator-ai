#!/usr/bin/env python3
"""生成首页 showcase 用的「成品底图」。

三条硬规则（都来自实测教训）：
  1. 提示词里不许出现 card —— 模型会理解成「画一张卡片」并自己写字
  2. 一律追加 no-text 负面约束 —— 否则会出现 "Happy 70th Runthdscket" 这类自写字
  3. 避开人脸 —— 没有参考图时模型给的是陌生人的脸，反而降低代入感
另外带文字的场景要在上方 1/3 留白，成品排版层要往那儿放标题。
"""
import json, os, sys, time, urllib.request

API = "https://api.minimaxi.com/v1/image_generation"
KEY = os.environ["MINIMAX_KEY"]
OUT = sys.argv[1] if len(sys.argv) > 1 else "/workspace/output/showcase"
os.makedirs(OUT, exist_ok=True)

NO_TEXT = ("no text, no lettering, no words, no numbers, no captions, "
           "no signage, no watermark, no signature, no logo")
SPACE = "generous empty space in the upper third, clean and uncluttered, soft light background there"

STYLE = {
 "watercolor": "delicate watercolor painting on textured paper, soft wet brush strokes, visible paper texture, pastel colors, hand painted illustration",
 "oil": "museum quality oil painting on canvas, thick impasto brush strokes, rich oil colors",
 "oil-pastel": "oil pastel drawing on textured paper, soft chalky strokes, gentle blended colors, nostalgic handmade feel",
 "vintage-postcard": "vintage postcard illustration, faded retro colors, halftone print texture, weathered paper edges, 1950s travel poster style",
 "impressionist": "impressionist oil painting, loose visible brushwork, luminous broken color, plein air light",
 "paper-cut": "paper cut art, layered flat cut paper collage, crisp silhouettes, soft drop shadows",
}

# id, 画风, 画面描述, 是否需要上方留白
TASKS = [
 ("hero-birthday", "watercolor",
  "a beautifully decorated birthday cake with lit candles on a linen tablecloth, a cluster of soft coloured balloons rising on the left, scattered confetti, warm golden window light behind, shallow depth of field, tender and joyful, delicate watercolor painting on textured paper, soft wet brush strokes, visible paper texture, pastel colors, hand painted illustration", True),
 ("person-mum", "watercolor",
  "a bouquet of garden roses and sweet peas tied with a linen ribbon resting on a wooden table beside a steaming cup of tea, lace doily, soft morning sunlight through a window, grateful and warm, delicate watercolor painting on textured paper, soft wet brush strokes, visible paper texture, pastel colors, hand painted illustration", True),
 ("person-dad", "oil-pastel",
  "a worn leather golf bag with a set of old clubs beside a thermos of tea and a knitted sweater on a wooden bench, early morning on a misty fairway behind, warm and unhurried, oil pastel drawing on textured paper, soft chalky strokes, gentle blended colors, nostalgic handmade feel", True),
 ("person-grandma", "oil",
  "a cascade of white roses and cream ribbons spilling across a marble mantelpiece, a cluster of elegant golden balloons tied with satin, champagne and gold palette, softly lit and deeply sentimental, museum quality oil painting on canvas, thick impasto brush strokes, rich oil colors", True),
 ("person-grandpa", "vintage-postcard",
  "a wooden rocking chair on a weathered porch with a fishing hat and a dented thermos of tea on the rail, a pair of worn boots below, faded 1950s colours, halftone print texture, aged paper edges, vintage postcard illustration, faded retro colors, halftone print texture, weathered paper edges, 1950s travel poster style", True),
 ("person-friend", "watercolor",
  "a simple jug of wildflowers on a scrubbed wooden table with a warm cup of tea and a folded letter, soft natural window light, sincere and understated, delicate watercolor painting on textured paper, soft wet brush strokes, visible paper texture, pastel colors, hand painted illustration", True),
 ("person-partner", "oil",
  "delicate white lace and ivory ribbons with soft pale roses, a pair of worn leather shoes, warm champagne gold accents on cream, elegant and timeless, museum quality oil painting on canvas, thick impasto brush strokes, rich oil colors", True),
 ("person-teacher", "impressionist",
  "a stack of well loved books with a brass school bell and a red apple on a teacher's desk, warm afternoon light through tall windows, golden and nostalgic, impressionist oil painting, loose visible brushwork, luminous broken color, plein air light", True),
 ("person-pet", "watercolor",
  "a portrait of a golden retriever wearing a striped party hat, looking straight at the viewer, soft studio light, plain warm background, charming and warm, delicate watercolor painting on textured paper, soft wet brush strokes, visible paper texture, pastel colors, hand painted illustration", False),
 ("scene-christmas", "watercolor",
  "a beautifully decorated tree glowing with warm lights beside a cottage window, snow falling gently on a deep red door, pine and a few wrapped gifts below, deep red forest green and gold palette, cosy winter evening, delicate watercolor painting on textured paper, soft wet brush strokes, visible paper texture, pastel colors, hand painted illustration", True),
 ("scene-wallart", "impressionist",
  "a nostalgic painting of a small english village street, a row of old stone and brick cottages, a church spire in the distance, quiet tree lined road, warm late afternoon light, impressionist oil painting, loose visible brushwork, luminous broken color, plein air light", False),
 ("scene-thankyou-parent", "oil-pastel",
  "a bedside window with soft morning light, a small jug of spring flowers on the sill, a folded blanket and reading glasses on a chair, calm muted sage and cream palette, quiet and caring, oil pastel drawing on textured paper, soft chalky strokes, gentle blended colors, nostalgic handmade feel", True),
]

def post(p):
    r = urllib.request.Request(API, data=json.dumps(p).encode(), method="POST",
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(r, timeout=220).read())

ok = 0
for tid, style, base, need_space in TASKS:
    prompt = f"{base}, {NO_TEXT}"
    if need_space:
        prompt += f", {SPACE}"
    p = {"model": "image-01", "prompt": prompt, "aspect_ratio": "3:4", "n": 1,
         "response_format": "url", "prompt_optimizer": False}
    t0 = time.time()
    try:
        d = post(p)
        br = d.get("base_resp") or {}
        urls = (d.get("data") or {}).get("image_urls") or []
        if br.get("status_code") == 0 and urls:
            fp = f"{OUT}/{tid}.jpg"
            urllib.request.urlretrieve(urls[0], fp)
            print(f"  v {tid:<22} {time.time()-t0:5.1f}s", flush=True)
            ok += 1
        else:
            print(f"  x {tid}: {br.get('status_code')} {br.get('status_msg')}", flush=True)
    except Exception as e:
        print(f"  x {tid}: {e}", flush=True)
    time.sleep(0.6)
print(f"\n完成 {ok}/{len(TASKS)}")
