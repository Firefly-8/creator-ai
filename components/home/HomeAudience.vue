<template>
  <!--
    按「人」而不是按「节日」组织入口。
    竞品 Silly Robot Cards 的做法：每张卡片是一句真实的话，
    不是「母亲节贺卡」这种品类词 —— 中老年的搜索路径是
    "birthday card for grandma"，不是 "mother's day card"。
  -->
  <div class="ck-audience">
    <a
      v-for="a in audiences"
      :key="a.id"
      :href="a.href"
      class="ck-audience__card"
    >
      <div class="ck-audience__media">
        <img :src="a.image" :alt="a.alt" loading="lazy" decoding="async" />
      </div>
      <div class="ck-audience__body">
        <h3 class="ck-audience__title">
          <span class="ck-audience__icon"><span class="ck-audience__glyph" :class="`i-${a.icon}`" /></span>
          {{ a.title }}
        </h3>
        <p class="ck-audience__line">{{ a.line }}</p>
        <span class="ck-audience__cta">
          Make one
          <span class="i-ph-arrow-right text-[14px]" />
        </span>
      </div>
    </a>
  </div>
</template>

<script setup lang="ts">
interface Audience {
  id: string
  title: string
  line: string
  image: string
  alt: string
  icon: string
  href: string
}

const audiences: Audience[] = [
  {
    id: 'mum',
    title: 'For Mum',
    line: 'A card for the mum who never asks for anything. She deserves a proper one.',
    image: 'https://assets.yozzytools.com/showcase/person-mum.webp',
    alt: 'A watercolour card of roses and carnations in a morning-lit garden',
    icon: 'ph-flower-lotus',
    href: '/for/mum',
  },
  {
    id: 'dad',
    title: 'For Dad',
    line: 'Dad loves tea and crosswords. Biscuit is the real boss.',
    image: 'https://assets.yozzytools.com/showcase/person-dad.webp',
    alt: 'An oil pastel card of a golf course at golden hour',
    icon: 'ph-golf',
    href: '/for/dad',
  },
  {
    id: 'grandma',
    title: 'For Grandma',
    line: 'Eighty years of stories. Give her one more to tell.',
    image: 'https://assets.yozzytools.com/showcase/person-grandma.webp',
    alt: 'An oil painting of golden balloons and white roses for a milestone birthday',
    icon: 'ph-crown',
    href: '/for/grandma',
  },
  {
    id: 'grandpa',
    title: 'For Grandpa',
    line: 'A quiet man, a long story, a rocking chair by the porch.',
    image: 'https://assets.yozzytools.com/showcase/person-grandpa.webp',
    alt: 'A vintage postcard style card of a rocking chair on a porch',
    icon: 'ph-armchair',
    href: '/for/grandpa',
  },
  {
    id: 'friend',
    title: 'For a Friend',
    line: 'They helped when it mattered. Say so, properly.',
    image: 'https://assets.yozzytools.com/showcase/person-friend.webp',
    alt: 'A watercolour card of wildflowers and a warm cup of tea',
    icon: 'ph-coffee',
    href: '/for/friend',
  },
  {
    id: 'partner',
    title: 'For a Partner',
    line: 'Fifty years of the same old story. Tell it beautifully.',
    image: 'https://assets.yozzytools.com/showcase/person-partner.webp',
    alt: 'An oil painting of white lace, ribbons and soft roses',
    icon: 'ph-heart',
    href: '/for/partner',
  },
  {
    id: 'teacher',
    title: 'For a Teacher',
    line: 'Thirty years of other people\'s children. Say goodbye properly.',
    image: 'https://assets.yozzytools.com/showcase/person-teacher.webp',
    alt: 'An impressionist painting of a beach at sunset with a single chair',
    icon: 'ph-chalkboard',
    href: '/for/teacher',
  },
  {
    id: 'pet',
    title: 'For a Pet',
    line: 'The dog is the boss. Everyone else just lives there.',
    image: 'https://assets.yozzytools.com/showcase/person-pet.webp',
    alt: 'A hand painted watercolour portrait of a golden retriever wearing a party hat',
    icon: 'ph-paw-print',
    href: '/for/pet',
  },
]
</script>

<style scoped>
.ck-audience {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 1.25rem;
}

.ck-audience__card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(58, 46, 38, 0.1);
  border-radius: 1.25rem;
  background: #fff;
  text-decoration: none;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.ck-audience__card:hover {
  transform: translateY(-3px);
  border-color: rgba(200, 84, 61, 0.35);
  box-shadow: 0 18px 40px -22px rgba(58, 46, 38, 0.4);
}

.ck-audience__media {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #f0e8dd;
}

.ck-audience__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.ck-audience__card:hover .ck-audience__media img {
  transform: scale(1.04);
}

.ck-audience__icon {
  display: inline-grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  margin-right: 0.55rem;
  border-radius: 999px;
  background: rgba(200, 84, 61, 0.1);
  vertical-align: -0.42em;
}
/* ⚠️ 图标必须放在**内层**元素上：
   UnoCSS 的图标是 `background-color: currentcolor + mask-image` 画的，
   而 scoped 样式的 `background` 简写（优先级 0,2,0 > UnoCSS 的 0,1,0）
   会把它盖掉 → 图标被涂成和背景同色 = 隐形。 */
.ck-audience__glyph {
  display: block;
  width: 1.15rem;
  height: 1.15rem;
  color: #c8543d;
}

.ck-audience__body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1rem 1.1rem 1.15rem;
}

.ck-audience__title {
  display: flex;
  align-items: center;
  font-family: var(--font-display, Sora), sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: #2a2420;
}

.ck-audience__line {
  font-size: 0.875rem;
  line-height: 1.5;
  color: #6b5f55;
  min-height: 2.6rem;
}

.ck-audience__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.35rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #c8543d;
}
</style>
