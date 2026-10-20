#!/usr/bin/env python3
"""
写入 Create Keepsakes 的博客文章（D1 blog_posts）

为什么用脚本而不是后台：
  文章内容是版本化的资产，走仓库 + 脚本才能 review、能回滚、能重跑。

用法：
  python3 scripts/seed-blog.py                    # 写 staging 库
  python3 scripts/seed-blog.py --env production   # 写生产库
  python3 scripts/seed-blog.py --env both
"""
import argparse
import json
import os
import subprocess
import sys
import time
import uuid

ACCOUNT = "9fb668990196a42386f3544fa69d5b76"
DB_STAGING = "craftai-db-staging"
DB_PROD = "craftai-db"

# 旧文章：音乐站时代的内容，与新定位不符，下线归档
ARCHIVE = ["getting-started", "ai-image-prompts", "music-marketing"]

POSTS = [
    {
        "slug": "how-to-write-a-birthday-message-for-your-mum",
        "title": "How to write a birthday message for your mum that doesn't sound like a card",
        "excerpt": "Most birthday messages for a mum are three words and a smiley face. Here is how to write one that actually sounds like you — and is still quick.",
        "tags": ["birthday", "messages", "for mum"],
        "reading_minutes": 4,
        "cover": "https://assets.yozzytools.com/showcase/person-mum.webp",
        "meta_title": "How to write a birthday message for your mum | Create Keepsakes",
        "meta_description": "Practical, quick tips for writing a birthday message for your mum that sounds personal, not generic. Plus what to actually say at 80.",
        "content": """Most birthday messages for a mum are three words and a smiley face. *Happy Birthday Mum!* It is not wrong. It is just not much.

The trouble is that a card is a physical thing you hand over, and the words stay on it. That means a generic message reads as a small forgetfulness — you had a whole year to think of something better.

Here is what actually works.

## Start with the specific, not the sentimental

The fastest way to make a message sound personal is to name a real thing. Not *"you are the best mum in the world"* — everyone writes that. Instead:

- The thing she always does on a Sunday morning
- The phrase she says when she is pleased but will not say it outright
- The holiday she talks about every single year
- A small habit of hers that nobody else notices

> "Happy Birthday Mum. Thanks for putting up with the crossword phone calls every single Sunday. Have a lovely day off for once."

That is not a better message because it is longer. It is better because it is **only true of her**.

## If you are stuck, borrow the structure and fill in the blanks

Most good messages are three moves:

1. **One specific thing** they did or that is just like them
2. **One simple wish** for the year ahead
3. **One small warm note** to close

For example:

> You still make the best lemon drizzle in the whole country, and I am not being polite. Hope this year is gentle with you. Love you loads.

That took about forty seconds to write once you have the shape.

## Do not over-promise on a big birthday

At 60, 70 or 80, the usual *"wishing you many more happy years"* lands badly, because everyone in the room is quietly doing the same maths. A more honest version:

> "Happy 80th, Mum. You have already done the hard bit — you raised us and you are still here. Enjoy the cake."

Naming the milestone honestly is more moving than pretending it is just another birthday.

## Practical things to get right

- **Get the name right.** Not "Mum", not "Mom" if she spells it "Mum". If her name is Margaret, use Margaret. This sounds trivial and it is the single most common failure.
- **Get the number right.** A card that says "Happy 60th" to someone turning 70 is the kind of mistake they keep. It is on the mantlepiece for twenty years.
- **Keep it to one or two lines.** Long messages on cards get skimmed. A short one gets read twice.
- **Sign it.** A printed card with no signature feels like a form letter. A name, even scrawled, is what makes it a letter.

## If the picture is the hard part

You do not need a camera and a design degree. Start from a photo of them, or from a picture of something that belongs to them — their garden, their dog, the view from their kitchen window, the cricket club they have been going to for thirty years. The picture carries the feeling; the words carry the fact.

That is also why the words should be typed rather than painted into the image. A painted name gets mangled. A typed one is exactly what you wrote.

## A last thought

The message does not have to be the best thing you have ever written for her. It has to be the most *you* thing you have written for her this year. That is a much lower bar, and you can clear it in a minute.

If you are making a card for your mum, you can start from a ready-made idea and put your own words on it — [make a birthday card for her](/cards?scenario=parents-day)."""
    },
    {
        "slug": "get-well-soon-card-message-what-to-write",
        "title": "What to write in a get well soon card when you don't know what to say",
        "excerpt": "Illness makes people awkward, and the card gets short and generic. Here is a way to say something kind without writing a novel or saying too much.",
        "tags": ["get well soon", "messages", "sympathy"],
        "reading_minutes": 4,
        "cover": "https://assets.yozzytools.com/showcase/scene-thankyou-parent.webp",
        "meta_title": "What to write in a get well soon card | Create Keepsakes",
        "meta_description": "How to write a kind, useful get well soon card message when illness has made you awkward. Short, real examples you can copy.",
        "content": """Illness is one of the few situations where people genuinely do not know what to say, so the card ends up saying almost nothing. *Get Well Soon!* A heart. Your signature.

And yet a get well soon card is one of the most useful things you can put in a hospital bag or send by post, because it is the one message that says *I have thought about you* without asking you to explain anything.

## Why the short generic version is worse than it looks

*"Get well soon"* is what you write when you do not want to make it awkward. But read on the other side, it says: *I did not know what to say, so I said this.*

A slightly longer, slightly more specific message says something quite different: *I was thinking about you, and this is what I thought.*

## The two-sentence version

Most people are over-thinking it. Try this shape:

> **Something true about right now.** "Reading your updates and feeling a lot better about the week."
> **Something small and forward-looking.** "The garden is going to need you in about six weeks."

That is a whole message. It is warm, it is not morbid, and it does not demand a reply.

## If you are not close

You do not have to be the best friend. A colleague or a neighbour can still write something good:

> "Thinking of you and your family. The kids have been asking about the tortoise, so there is clearly unfinished business."

Humor is a risk if you do not know them well. The tortoise is safe. The dark joke is not.

## If you are close

Say the thing you would say out loud, and then say one more thing. The second thing is usually the good one:

> "Get better soon. And when you are back, we are going to that restaurant we cancelled three times."

## A few practical notes

- **Do not say "let me know if you need anything"** unless you mean it and you will be annoyed when they say yes. A better version: *"I am bringing soup on Thursday and you are not allowed to say no."*
- **Do not ask when they are going home.** Everyone else is asking.
- **Do mention something outside the illness.** The day they get a card about their garden, their dog or the book they are reading, it lands completely differently from another message about their health.
- **Keep it to one side of a card.** People read these in hospital corridors. They are tired.

## If you are making the card yourself

Pick a quiet picture — a window, flowers, a warm light, a sleeping dog. Nothing loud, nothing with a huge sun in it. And keep the words short; let the picture do the calm part.

You can start from a ready-made idea and write your own message on it — [make a get well soon card](/cards?scenario=get-well)."""
    },
    {
        "slug": "60th-70th-birthday-gift-ideas",
        "title": "60th and 70th birthday gift ideas that are not mugs or chocolate",
        "excerpt": "The problem with a big birthday is that everything sensible is already in the house. Here is how to give something personal when the usual list is exhausted.",
        "tags": ["birthday", "gift ideas", "milestone"],
        "reading_minutes": 5,
        "cover": "https://assets.yozzytools.com/showcase/person-grandma.webp",
        "meta_title": "60th and 70th birthday gift ideas | Create Keepsakes",
        "meta_description": "Personal milestone birthday gift ideas for a parent or grandparent, when mugs and chocolate are not going to cut it.",
        "content": """There is a particular kind of panic that happens at a big birthday. You are supposed to mark a significant year, and the only things in the shop are mugs, chocolates, and a candle that says "60" in a font designed to be seen from across a garden centre.

The problem with a milestone birthday is that **everything sensible is already in the house**. She has a mug. She has a chocolate box. What she does not have is anything that says *I have been paying attention to who you are*.

## The rule worth remembering

A good milestone gift is not about the value. It is about the **specificity**.

A £15 present that only she could receive beats a £150 present that could go to anyone. The second one is a transaction. The first one is a message.

## Ideas that work, grouped by what they are

### Things that capture a place
- The house they grew up in, painted, and framed
- The view from their kitchen window, or the street they have lived on for forty years
- The garden, in the season they love it

These are the ones people keep. A picture of a place that matters to someone stays on a wall for twenty years; a mug goes in a cupboard in a fortnight.

### Things that capture a person
- A portrait of them, in a style they would actually like
- Their dog, their horse, their garden, their allotment
- A picture built around an inside joke that only your family understands

### Things that capture a chapter
- The year they met your other parent
- The year they did something they had not told you about
- A hobby they gave up but never stopped loving

## The version that costs nothing

Sometimes the best thing is not a thing at all.

- A card with their name on it, spelled right, and a message only you would write
- A printed page of a photograph you took of them, the size of a small poster
- A hand-written letter, folded into an envelope, with the actual date on it

That last one sounds old-fashioned. It works because almost nobody does it any more.

## Getting the details right

At a milestone birthday the small errors are disproportionately painful, because the card gets kept:

- **The number.** 60th, 70th, 80th — do not guess, and do not let a tool guess for you
- **The name.** Margaret, not "Mom" or "Mum" if that is what you normally call her
- **The date.** Sixty is 60 years, not the year they were born
- **The relationship.** "Your mum" and "my mum" are not the same thing

## A thought on the pictures themselves

If you do get them a picture, make sure the words on it are **typeset, not painted**. We tested this the hard way: an image model asked to write "Happy 70th Birthday, Margaret" produced *"Happy 70th Runthdscket"*. It is funny. It is also a card for someone's eightieth birthday, and it will be on a wall for two decades.

The picture should look like a painting. The writing should look like typing. It is a small thing that makes the whole thing work.

You can put a picture of them, their dog, or their village on a card in a few minutes — [start a milestone card here](/cards?scenario=milestone)."""
    },
    {
        "slug": "why-card-words-should-be-typed-not-painted",
        "title": "Why the words on an AI greeting card should be typed, not painted",
        "excerpt": "We let the model paint the picture and the machine set the words. That sounds backwards until you see what a model does with the name Margaret.",
        "tags": ["how we work", "design", "quality"],
        "reading_minutes": 4,
        "cover": "https://assets.yozzytools.com/showcase/person-grandpa.webp",
        "meta_title": "Why we typeset card words instead of painting them | Create Keepsakes",
        "meta_description": "What happens when you ask an image model to write a name on a birthday card, and why the words on our cards are typed instead of painted.",
        "content": """When we build a card, the picture is made by an image model and the words are set by a computer. Most people assume that is backwards — surely a machine that draws a birthday cake should also be able to write *"Happy Birthday"* on it?

It cannot. Not reliably. And the failure is funny enough that we have to warn you about it.

## What actually happens

Early on, we asked a model to make a 70th birthday card for a man called Jim. The result was a warm, watercolour scene of a rocking chair on a porch, with a sign hanging above it reading:

> **Happy 70th Runthdscket**

The picture was lovely. The letters were not letters.

We have seen it produce a *"get well soon"* sign that leaned at an angle, and a hand-painted banner that read more or less *"Hapoy Bithday"*. Every one of them looked like a genuine mistake, and every one of them would have been printed on a card and handed to somebody's grandmother.

## Why it happens

Two reasons, and both are structural rather than fixable:

**1. A picture model paints shapes, it does not spell.** It has learned what lettering *looks like* — the texture, the colour, the slant — without learning the difference between a letter and a plausible mark that resembles a letter. Ask it for a specific word and it will produce something in the visual neighbourhood of that word.

**2. The word "card" is a trap.** The moment a prompt says *"birthday card"*, the model is no longer being asked for a scene. It is being asked for a card, and cards have writing on them. So it writes — badly.

## What we do instead

We take the word "card" out of the picture, and we take the writing out of the picture too.

- The prompt describes a **scene**: a rocking chair, a thermos of tea, a striped hat, a window with the morning coming through. It also carries a standing instruction that the image contains no text, no lettering, no numbers and no signature.
- The picture is generated with the top third left deliberately empty, because that is where the words will go.
- The words — the name, the age, the message, the signature — are then **typeset** on top, using a real typeface, at a real size, with a real line break.

That last step is the whole point.

## Why typed wins on every axis

- **Correctness.** *"Margaret"* comes out as Margaret, every time, with the spelling you chose. A model would give you Margaret, Margarett, Margret and a genuinely alarming Marget at random.
- **Legibility.** At 5 × 7 inches, printed and pinned to a fridge, a 14-point serif name is readable. Painted lettering at that size is a smudge.
- **Editability.** You can change the name, the number, the message and the signature in a second. With painted lettering you would have to regenerate the entire picture and hope the composition did not move.
- **Print quality.** Text is resolution-independent. Scale a card to 16 × 20 inches and the words are still crisp. Painted lettering scales into mush.

## The trade-off, honestly

There is a real trade-off here, and it is worth naming.

A painted word, when it works, has a lovely quality — it sits *in* the picture, like a sign in a scene. A typeset word sits *on* the picture, like a card. Some people prefer the first, and there are image models that can fake a legible sign if you are lucky.

But lucky is not a product. A card is something you give a person on the one day their name is spoken out loud in front of everyone. It had better be right.

## The general principle

There is a wider lesson in this, and it applies well beyond cards:

**Let the model do the part it is good at, and let ordinary software do the part that has to be exactly right.**

A model is extraordinary at painting a golden retriever in a party hat. It is a slow, unreliable way of typing a name. Use each tool for the job it is actually good at, and the result is not a compromise — it is the best of both.

That is also why the words on every card we make are typed, and why the pictures are made to look painted. The best card is not the one where a machine did everything. It is the one where each part was done by the thing that does it best."""
    },
]


# CF D1 REST API 用 database_id（不是 bucket 名）
DB_IDS = {
    DB_STAGING: "8e812571-57b0-4232-bfc4-13264dc9e420",
    DB_PROD: "bb60e6ae-597c-4cd7-a958-46942f5dffec",
}


def wrangler_d1(db, sql, params=None):
    """执行 D1 查询（走 CF REST API；wrangler --file 不接受 JSON payload）"""
    import urllib.request

    token = os.environ.get("CLOUDFLARE_API_TOKEN") or os.environ.get("CLOUDFLARE_TOKEN")
    if not token:
        raise RuntimeError("缺少 CLOUDFLARE_API_TOKEN")

    payload = {"sql": sql}
    if params:
        payload["params"] = params
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}"
        f"/d1/database/{DB_IDS[db]}/query"
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read())
    if not data.get("success"):
        raise RuntimeError(json.dumps(data.get("errors"))[:500])
    result = data.get("result")
    if isinstance(result, list):
        result = result[0]
    return (result or {}).get("results", [])


def upsert_post(db, post):
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    existing = wrangler_d1(
        db, "SELECT id FROM blog_posts WHERE slug = ?", [post["slug"]]
    )
    if existing:
        pid = existing[0]["id"]
        sql = (
            "UPDATE blog_posts SET title=?, excerpt=?, content=?, cover_image=?, tags=?, "
            "status='published', meta_title=?, meta_description=?, reading_minutes=?, "
            "author_name=?, published_at=COALESCE(published_at, ?), updated_at=? WHERE id=?"
        )
        params = [
            post["title"], post["excerpt"], post["content"], post["cover"],
            json.dumps(post["tags"]), post["meta_title"], post["meta_description"],
            post["reading_minutes"], "Create Keepsakes", now, now, pid,
        ]
    else:
        pid = str(uuid.uuid4())
        sql = (
            "INSERT INTO blog_posts "
            "(id, slug, title, excerpt, content, cover_image, tags, status, author_name, "
            " meta_title, meta_description, reading_minutes, published_at, created_at, updated_at) "
            "VALUES (?,?,?,?,?,?,?,'published',?,?,?,?,?,?,?)"
        )
        params = [
            pid, post["slug"], post["title"], post["excerpt"], post["content"],
            post["cover"], json.dumps(post["tags"]), "Create Keepsakes",
            post["meta_title"], post["meta_description"], post["reading_minutes"],
            now, now, now,
        ]
    wrangler_d1(db, sql, params)
    return pid


def archive_old(db):
    for slug in ARCHIVE:
        wrangler_d1(
            db,
            "UPDATE blog_posts SET status='archived', updated_at=? WHERE slug=?",
            [time.strftime("%Y-%m-%d %H:%M:%S"), slug],
        )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", default="staging", choices=["staging", "production", "both"])
    args = ap.parse_args()

    dbs = {"staging": [DB_STAGING], "production": [DB_PROD], "both": [DB_STAGING, DB_PROD]}

    for db in dbs[args.env]:
        print(f"── {db} ──")
        for post in POSTS:
            pid = upsert_post(db, post)
            print(f"  v {post['slug']} ({pid[:8]})")
        archive_old(db)
        print(f"  · 归档旧文 {len(ARCHIVE)} 篇")
        rows = wrangler_d1(
            db,
            "SELECT slug, status FROM blog_posts ORDER BY published_at DESC",
        )
        for r in rows:
            print(f"    {r['status']:<10} {r['slug']}")


if __name__ == "__main__":
    main()
