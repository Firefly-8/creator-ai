<template>
  <div class="ck-gallery">
    <div class="ck-wrap">
      <header class="ck-gallery__head">
        <p class="ck-badge">
          <span class="i-ph-squares-four" /> Made with Create Keepsakes
        </p>
        <h1 class="ck-h1">Cards people made</h1>
        <p class="ck-lede">
          Every one of these started with a photo, an occasion and a few
          words. Have a look — then make one that is only yours.
        </p>
      </header>

      <!-- 分类 -->
      <div class="ck-filters">
        <button
          v-for="f in filters"
          :key="f.id"
          class="ck-filter"
          :class="{ 'ck-filter--on': filter === f.id }"
          @click="filter = f.id"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- 网格 -->
      <div class="ck-grid">
        <figure
          v-for="c in visible"
          :key="c.id"
          class="ck-item"
        >
          <NuxtLink :to="c.to" class="ck-item__media">
            <img
              :src="c.image"
              :alt="c.alt"
              loading="lazy"
              decoding="async"
            />
          </NuxtLink>
          <figcaption class="ck-item__cap">
            <span class="ck-item__tag">{{ c.tag }}</span>
            <span class="ck-item__text">{{ c.caption }}</span>
          </figcaption>
        </figure>
      </div>

      <!-- 分享 CTA -->
      <section class="ck-share">
        <div class="ck-share__icon i-ph-hand-heart" />
        <div>
          <h2 class="ck-share__title">Made something lovely?</h2>
          <p class="ck-share__text">
            Share it with the people you love. Your photos stay private until
            you decide otherwise — we never publish them on our own.
          </p>
        </div>
        <NuxtLink to="/cards" class="ck-btn ck-btn--primary">
          Make your own
          <span class="i-ph-arrow-right" />
        </NuxtLink>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useHead({
  title: 'Cards people made — Create Keepsakes',
  meta: [{
    name: 'description',
    content: 'A wall of finished cards — birthdays, thank you notes, wall art — all made with Create Keepsakes.',
  }],
  link: [{ rel: 'canonical', href: 'https://create.yozzytools.com/gallery' }],
})

const ASSET = 'https://assets.yozzytools.com/showcase'

interface Card {
  id: string
  image: string
  alt: string
  tag: string
  caption: string
  cat: string
  to: string
}

const CARDS: Card[] = [
  {
    id: 'hero-birthday', image: `${ASSET}/hero-birthday.webp`,
    alt: 'A birthday card for Margaret with a cake and balloons',
    tag: 'Birthday', caption: 'A cake, some balloons, and a name spelled right',
    cat: 'birthday', to: '/cards?scenario=birthday',
  },
  {
    id: 'person-grandma', image: `${ASSET}/person-grandma.webp`,
    alt: 'A milestone birthday card with golden balloons and white roses',
    tag: 'Milestone', caption: 'Eighty years of you, in gold and cream',
    cat: 'birthday', to: '/cards?scenario=milestone',
  },
  {
    id: 'person-mum', image: `${ASSET}/person-mum.webp`,
    alt: 'A card of garden roses beside a cup of tea',
    tag: 'For Mum', caption: 'Roses, a cup of tea, and a thank you',
    cat: 'family', to: '/cards?scenario=parents-day',
  },
  {
    id: 'person-dad', image: `${ASSET}/person-dad.webp`,
    alt: 'A card showing a golf bag and a thermos of tea',
    tag: 'For Dad', caption: 'A golf bag, a thermos, and a Sunday morning',
    cat: 'family', to: '/cards?scenario=retirement',
  },
  {
    id: 'person-grandpa', image: `${ASSET}/person-grandpa.webp`,
    alt: 'A vintage postcard style card with a rocking chair on a porch',
    tag: 'Milestone', caption: 'A rocking chair and seventy years young',
    cat: 'birthday', to: '/cards?scenario=milestone',
  },
  {
    id: 'person-friend', image: `${ASSET}/person-friend.webp`,
    alt: 'A card of wildflowers and a warm cup of tea',
    tag: 'Thank you', caption: 'For the friend who turned up when it mattered',
    cat: 'thanks', to: '/cards?scenario=thank-you',
  },
  {
    id: 'person-partner', image: `${ASSET}/person-partner.webp`,
    alt: 'A card of white lace and soft roses',
    tag: 'Anniversary', caption: 'Twenty-five years of you',
    cat: 'family', to: '/cards?scenario=wedding',
  },
  {
    id: 'person-teacher', image: `${ASSET}/person-teacher.webp`,
    alt: 'A card of a school bell, books and a red apple',
    tag: 'Thank you', caption: 'Thirty years of other people’s children',
    cat: 'thanks', to: '/cards?scenario=retirement',
  },
  {
    id: 'person-pet', image: `${ASSET}/person-pet.webp`,
    alt: 'A watercolour portrait of a golden retriever in a party hat',
    tag: 'For a pet', caption: 'The one who is really in charge',
    cat: 'pets', to: '/cards?scenario=pet',
  },
  {
    id: 'scene-christmas', image: `${ASSET}/scene-christmas.webp`,
    alt: 'A Christmas card with a decorated tree glowing beside a red door',
    tag: 'Christmas', caption: 'Snow, a warm window, and a tree that is properly decorated',
    cat: 'holiday', to: '/cards?scenario=christmas',
  },
  {
    id: 'scene-thankyou-parent', image: `${ASSET}/scene-thankyou-parent.webp`,
    alt: 'A quiet get well soon card with spring flowers by a window',
    tag: 'Get well soon', caption: 'Said gently, without fuss',
    cat: 'thanks', to: '/cards?scenario=get-well',
  },
  {
    id: 'scene-wallart', image: `${ASSET}/scene-wallart.webp`,
    alt: 'An impressionist painting of a small village street',
    tag: 'Wall art', caption: 'The village you grew up in, on a 16 × 20 canvas',
    cat: 'wall', to: '/cards?scenario=hometown',
  },
]

const filters = [
  { id: 'all', label: 'Everything' },
  { id: 'birthday', label: 'Birthdays' },
  { id: 'family', label: 'Family' },
  { id: 'thanks', label: 'Thank you' },
  { id: 'holiday', label: 'Christmas' },
  { id: 'wall', label: 'Wall art' },
  { id: 'pets', label: 'Pets' },
]

const filter = ref('all')
const visible = computed(() =>
  filter.value === 'all' ? CARDS : CARDS.filter(c => c.cat === filter.value),
)
</script>

<style scoped>
.ck-gallery {
  --ck-bg: #fbf7f1;
  --ck-cream: #f5ede1;
  --ck-white: #fffdfa;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.12);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;
  --ck-serif: 'Playfair Display', Georgia, serif;

  min-height: 70vh;
  padding: 3.5rem 0 5rem;
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: 'Manrope', system-ui, sans-serif;
}
.ck-wrap { max-width: 74rem; margin: 0 auto; padding: 0 1.5rem; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  font-weight: 600;
  line-height: 1.1;
}
.ck-lede { margin-top: 0.9rem; font-size: 1.0625rem; line-height: 1.6; color: var(--ck-ink-2); max-width: 48ch; }

.ck-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: rgba(200, 84, 61, 0.1);
  color: var(--ck-coral-deep);
  font-size: 0.8125rem;
  font-weight: 600;
}
.ck-gallery__head { max-width: 44rem; margin-bottom: 2rem; }

/* ---------- 筛选 ---------- */
.ck-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.75rem; }
.ck-filter {
  padding: 0.45rem 0.95rem;
  border: 1px solid var(--ck-line);
  border-radius: 999px;
  background: var(--ck-white);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}
.ck-filter:hover { border-color: var(--ck-coral); color: var(--ck-coral-deep); }
.ck-filter--on { background: var(--ck-ink); border-color: var(--ck-ink); color: #fff; }

/* ---------- 网格 ---------- */
.ck-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 1.5rem;
}
.ck-item { margin: 0; display: flex; flex-direction: column; }
.ck-item__media {
  display: block;
  border-radius: 1rem;
  overflow: hidden;
  background: var(--ck-cream);
  box-shadow: 0 18px 40px -24px rgba(58, 46, 38, 0.5);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.ck-item__media:hover { transform: translateY(-4px); box-shadow: 0 26px 50px -24px rgba(58, 46, 38, 0.55); }
.ck-item__media img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; }
.ck-item__cap { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.75rem; }
.ck-item__tag {
  align-self: flex-start;
  padding: 0.12rem 0.55rem;
  border-radius: 999px;
  background: rgba(200, 84, 61, 0.1);
  color: var(--ck-coral-deep);
  font-size: 0.6875rem;
  font-weight: 700;
}
.ck-item__text { font-size: 0.875rem; line-height: 1.5; color: var(--ck-ink-2); }

/* ---------- 分享 CTA ---------- */
.ck-share {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
  margin-top: 4rem;
  padding: 2.25rem 2rem;
  border-radius: 1.25rem;
  background: var(--ck-cream);
}
.ck-share__icon { font-size: 2.5rem; color: var(--ck-coral); }
.ck-share__title { margin: 0; font-family: var(--ck-serif); font-size: 1.5rem; font-weight: 600; }
.ck-share__text { margin: 0.4rem 0 0; max-width: 46ch; font-size: 0.9375rem; line-height: 1.6; color: var(--ck-ink-2); }
.ck-share .ck-btn { margin-left: auto; }

.ck-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.85rem 1.6rem;
  border: 1.5px solid transparent;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}
.ck-btn--primary { background: var(--ck-coral); color: #fff; }
.ck-btn--primary:hover { background: var(--ck-coral-deep); }

@media (max-width: 700px) {
  .ck-share .ck-btn { margin-left: 0; }
}
</style>
