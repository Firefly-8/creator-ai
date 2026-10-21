/**
 * 按人分类的落地页数据 —— Create Keepsakes
 *
 * 为什么按「人」而不是按「节日」组织：
 *   海外中老年人的真实心智是「给妈妈做张生日卡」，
 *   不是「按节日挑模板」。搜索引擎那边也是这么搜的
 *   （"birthday card for mum" / "gift for grandma" 的量级远大于 "christmas card"）。
 *
 * 每条都对应一个可独立被收录的 URL：/for/mum、/for/dad …
 * CTA 落到 /cards?scenario=xxx，直接进创作流。
 */

export interface AudienceScenario {
  /** 对应 utils/imageScenarios.ts 里的 scenario id */
  id: string
  /** 这张卡片是干什么用的（落地页上给用户看的一句话） */
  blurb: string
}

export interface AudienceFaq {
  q: string
  a: string
}

export interface AudienceDef {
  slug: string
  /** 导航/卡片上的短名 */
  short: string
  /** H1 —— 带关键词，别写成营销话 */
  h1: string
  /** 副标题，一句话说清"这是什么" */
  tagline: string
  /** Hero 配图（R2 showcase 目录） */
  hero: string
  /** 展示图 */
  gallery: string[]
  /** 相关场景 */
  scenarios: AudienceScenario[]
  /** 三点说明 */
  points: { title: string; text: string }[]
  /** FAQ —— 长尾搜索的主要入口 */
  faqs: AudienceFaq[]
  /** 底部 CTA 文案 */
  cta: string
}

export const AUDIENCES: AudienceDef[] = [
  {
    slug: 'mum',
    short: 'Mum',
    h1: 'Personalised Birthday Card for Mum',
    tagline:
      'She will not see a generic card in a shop. Give her a picture of the two of you, with your own words on it.',
    hero: 'showcase/person-mum.webp',
    gallery: ['showcase/person-mum.webp', 'showcase/hero-birthday.webp', 'showcase/person-grandma.webp'],
    scenarios: [
      { id: 'birthday', blurb: 'Her birthday — the one day a year she actually wants a card.' },
      { id: 'milestone', blurb: 'Big birthdays: 60, 70, 80. The ones worth marking.' },
      { id: 'parents-day', blurb: "Mother's Day, when everybody forgets until the Saturday." },
      { id: 'thank-you', blurb: 'No occasion needed. Sometimes just thank her.' },
    ],
    points: [
      { title: 'Her photo, not a template', text: 'Upload a picture of her. The card is painted around it, so it looks like her.' },
      { title: 'Your words, typed once', text: 'Write the message, or let the assistant draft one you can edit.' },
      { title: 'Ready to print', text: 'Download a clean file at 300 DPI — the size a card actually is.' },
    ],
    faqs: [
      { q: 'What can I write on a birthday card for my mum?', a: 'The short version works best: what she did for you, and one thing you want to do with her this year. "Happy 70th Mum — thank you for every Sunday lunch you ever cooked me. Let us do more of them this year."' },
      { q: 'What size is the finished card?', a: '5 × 7 inches, 4 × 6 inches or A6 — all exported at 300 DPI so they print sharp on a home printer or a photo print shop.' },
      { q: 'Do I need to be good at design?', a: 'No. You pick a scene, a style and a name. Everything else is done for you.' },
      { q: 'Can I use a photo of her that I took on my phone?', a: 'Yes. That is the normal way people do it. Crop it roughly to her face and shoulders and it works.' },
      { q: 'Is there a watermark on the free download?', a: 'There is a small one. Removing it, plus the 2K file, is part of the paid options.' },
    ],
    cta: 'Make a card for Mum',
  },
  {
    slug: 'dad',
    short: 'Dad',
    h1: 'Personalised Birthday Card for Dad',
    tagline:
      'A card that looks like it took an hour to make. Because you did — you just did not have to draw it.',
    hero: 'showcase/person-dad.webp',
    gallery: ['showcase/person-dad.webp', 'showcase/hero-birthday.webp', 'showcase/scene-christmas.webp'],
    scenarios: [
      { id: 'birthday', blurb: 'His birthday. Even the quiet ones deserve a card.' },
      { id: 'retirement', blurb: 'The last day at work. He will not get another one like it.' },
      { id: 'milestone', blurb: '60, 70, 80 — a round number worth marking properly.' },
      { id: 'our-home', blurb: 'The house, the garden, the dog — the things he built his life around.' },
    ],
    points: [
      { title: 'Him, in the picture', text: 'Use a photo of your dad. The style is painted around his face, not over it.' },
      { title: 'Say the thing you meant', text: 'Draft it in the assistant, then make it sound like you spoke it.' },
      { title: 'Print it on the mantelpiece', text: '300 DPI, real card sizes, no stretching.' },
    ],
    faqs: [
      { q: 'What to write in a birthday card for dad who is hard to buy for?', a: 'Skip the object. A card that says something specific about him is the thing he will not throw away. "Happy 70th Dad — you taught me to fix things badly and confidently."' },
      { q: 'Can I make a retirement card for my dad?', a: 'Yes. Pick the retirement scene, add his photo, and the card is sized and ready to print for the collection at work.' },
      { q: 'Will the picture still look like my dad?', a: 'Yes. The photo is the subject, not a starting point. The styles that distort faces are not offered for reference images.' },
      { q: 'How long does it take?', a: 'Upload a photo, pick a style, write a line, download. A few minutes.' },
    ],
    cta: 'Make a card for Dad',
  },
  {
    slug: 'grandma',
    short: 'Grandma',
    h1: 'Personalised Birthday Card for Grandma',
    tagline:
      'For the grandmother whose grandchildren are her whole week. Give her something to hold on to.',
    hero: 'showcase/person-grandma.webp',
    gallery: ['showcase/person-grandma.webp', 'showcase/person-mum.webp', 'showcase/hero-birthday.webp'],
    scenarios: [
      { id: 'birthday', blurb: 'Her birthday — grandchildren calling is the only thing she counts.' },
      { id: 'milestone', blurb: '90th, 100th. The big round birthdays.' },
      { id: 'family-reunion', blurb: 'Everyone in one photo, for the first time in years.' },
      { id: 'thank-you', blurb: 'For everything she does without being asked.' },
    ],
    points: [
      { title: 'Her face, large', text: 'Older photos of grandmothers often work best — a face on a card she can actually see.' },
      { title: 'Words from the grandchildren', text: 'Add the names of the grandkids. It is the detail that makes her cry.' },
      { title: 'Big enough to frame', text: 'The canvas print option turns the same picture into something for the wall.' },
    ],
    faqs: [
      { q: 'What can I write in a card for a grandmother?', a: 'Name the grandchildren. A grandmother card that says "we love you" is forgettable; one that says "Nana, Leo counted the days until he saw you" is not.' },
      { q: 'Can I put several family photos in one card?', a: 'You can upload a photo with more than one person in it, or make several cards and print them together.' },
      { q: 'She is not very good with technology. Does she need to do anything?', a: 'No. You make it, you download it or print it, you send it to her. She only receives a picture.' },
      { q: 'Can I make a wall print as well as a card?', a: 'Yes. The same image can be made as a 16 × 20 inch canvas print for her wall.' },
    ],
    cta: 'Make a card for Grandma',
  },
  {
    slug: 'grandpa',
    short: 'Grandpa',
    h1: 'Personalised Birthday Card for Grandpa',
    tagline:
      'A card with his face on it, in his own front room. The kind he will show to the neighbours.',
    hero: 'showcase/person-grandpa.webp',
    gallery: ['showcase/person-grandpa.webp', 'showcase/scene-wallart.webp?v=2', 'showcase/person-mum.webp'],
    scenarios: [
      { id: 'birthday', blurb: 'His birthday. Make it the one card he actually opens.' },
      { id: 'milestone', blurb: 'The big ones — 80, 90, 100.' },
      { id: 'hometown', blurb: 'The town he grew up in. He will tell that story again.' },
      { id: 'retirement', blurb: 'If he is the one retiring.' },
    ],
    points: [
      { title: 'His photograph', text: 'The card is built around him, so it still looks like him in any style.' },
      { title: 'A place he knows', text: 'Hometown, the house, the garden — pictures of his life, not a generic meadow.' },
      { title: 'Something for the mantelpiece', text: 'A 5 × 7 card printed at 300 DPI looks like a proper card, not a screenshot.' },
    ],
    faqs: [
      { q: 'What to write for a grandfather who does not read much?', a: 'Keep it to two lines and one photo. Grandparents who are not big readers still read a card with their own face on it — they look at it many times.' },
      { q: 'Can I make a card about the place he grew up?', a: 'Yes, there is a "My Hometown" scene made exactly for that.' },
      { q: 'Is the card print quality good enough for a photo shop?', a: 'Yes. 300 DPI at 5 × 7 inches is 1500 × 2100 pixels — what a print shop asks for.' },
    ],
    cta: 'Make a card for Grandpa',
  },
  {
    slug: 'friend',
    short: 'A Friend',
    h1: 'Personalised Thank You Card for a Friend',
    tagline:
      'The thank you you keep meaning to send. With their face on it, so it does not feel like a form letter.',
    hero: 'showcase/person-friend.webp',
    gallery: ['showcase/person-friend.webp', 'showcase/person-teacher.webp', 'showcase/hero-birthday.webp'],
    scenarios: [
      { id: 'thank-you', blurb: 'For the favour, the help, the evening you did not have to do.' },
      { id: 'birthday', blurb: 'Their birthday, if you are the kind of friend who remembers.' },
      { id: 'sympathy', blurb: 'When someone is grieving, a card that says it properly helps.' },
      { id: 'get-well', blurb: 'For the weeks you are stuck in bed.' },
    ],
    points: [
      { title: 'Personal, not generic', text: 'Their face in the picture does most of the work.' },
      { title: 'Your message, your tone', text: 'Edit the draft until it sounds like you, not like a template.' },
      { title: 'Post it or hand it over', text: 'Download and print, or send the picture straight to their phone.' },
    ],
    faqs: [
      { q: 'What to write in a thank you card for a friend?', a: 'Name the thing. "Thanks for driving me to the hospital at 11pm" beats "thanks for everything" every time.' },
      { q: 'Can I make a sympathy card?', a: 'Yes. There is a sympathy scene with restrained styling — it does not look cheerful, which is what a sympathy card should not be.' },
      { q: 'How do I send the finished card to them?', a: 'Download it and send by message, email or post, or print it at home.' },
    ],
    cta: 'Make a card for a friend',
  },
  {
    slug: 'partner',
    short: 'A Partner',
    h1: 'Personalised Anniversary Card for Your Partner',
    tagline:
      'Anniversaries are the easiest to forget and the worst to get wrong. A picture of you two, with your words.',
    hero: 'showcase/person-partner.webp',
    gallery: ['showcase/person-partner.webp', 'showcase/person-friend.webp', 'showcase/hero-birthday.webp'],
    scenarios: [
      { id: 'wedding', blurb: 'Your anniversary, and the day you got married.' },
      { id: 'birthday', blurb: 'Their birthday, on the same week as everything else.' },
      { id: 'our-home', blurb: 'The house, the cat, the sofa — the life you built.' },
      { id: 'four-seasons', blurb: 'A quiet anniversary card, not a shouting one.' },
    ],
    points: [
      { title: 'A photo of the two of you', text: 'The card looks like your relationship, not a stock couple.' },
      { title: 'Say the real thing', text: 'The assistant can start you off; you fix the words until they are true.' },
      { title: 'Keep it forever', text: 'A printed card on the fridge beats a message that scrolls away.' },
    ],
    faqs: [
      { q: 'What to write in an anniversary card for a husband or wife?', a: 'One memory with a date in it. "Ten years ago we were arguing about the sofa. Today I would do it again."' },
      { q: 'Can I use a photo of us from a holiday?', a: 'Yes. Any photo where you can both be seen works. A holiday one is often the best.' },
      { q: 'Do you make wedding cards too?', a: 'Yes — thank you cards, table cards and the same personal style, all at card sizes.' },
    ],
    cta: 'Make a card for your partner',
  },
  {
    slug: 'teacher',
    short: 'A Teacher',
    h1: 'Personalised Thank You Card for a Teacher',
    tagline:
      'The end of year, or any day she earned it. A card with the class photo and a line that is actually yours.',
    hero: 'showcase/person-teacher.webp',
    gallery: ['showcase/person-teacher.webp', 'showcase/person-friend.webp', 'showcase/hero-birthday.webp'],
    scenarios: [
      { id: 'thank-you', blurb: 'End of term, end of year, or just because.' },
      { id: 'graduation', blurb: 'For the student who finally got there.' },
      { id: 'new-baby', blurb: 'Congratulations for a colleague expecting.' },
      { id: 'retirement', blurb: 'For the one leaving after thirty years.' },
    ],
    points: [
      { title: 'Her photo, the class photo', text: 'One picture of the person, or of the people she taught.' },
      { title: 'Signed by a student', text: 'Type the name of the pupil — it is the detail teachers keep.' },
      { title: 'Right size for a school office', text: '5 × 7 and A6 both print cleanly on ordinary paper.' },
    ],
    faqs: [
      { q: 'What to write in a thank you card for a teacher?', a: 'A specific thing she did, and the name of the pupil it was for. Teachers keep the ones that are specific.' },
      { q: 'Can I make a card for several teachers?', a: 'Make one card for each. Download them together and print on a sheet.' },
      { q: 'Can I put our class photo in it?', a: 'Yes. Upload the class photo — the styling keeps the faces readable.' },
    ],
    cta: 'Make a card for a teacher',
  },
  {
    slug: 'pet',
    short: 'A Pet',
    h1: 'Personalised Card for Your Dog or Cat',
    tagline:
      'The card people actually want, and the one they cry at. Their face, your words, printed properly.',
    hero: 'showcase/person-pet.webp',
    gallery: ['showcase/person-pet.webp', 'showcase/scene-wallart.webp?v=2', 'showcase/person-grandpa.webp'],
    scenarios: [
      { id: 'pet', blurb: 'Their birthday, and every other day.' },
      { id: 'sympathy', blurb: 'For when it is time to say goodbye.' },
      { id: 'four-seasons', blurb: 'A picture of them on the sofa, on the beach, in the garden.' },
      { id: 'our-home', blurb: 'The room they claimed as theirs.' },
    ],
    points: [
      { title: 'They still look like themselves', text: 'The styles offered with a photo keep the face and markings intact.' },
      { title: 'Genuinely moving', text: 'The sympathy scene is deliberately gentle — no silly colours.' },
      { title: 'Print it large', text: 'A pet portrait works even better as a 16 × 20 canvas print.' },
    ],
    faqs: [
      { q: 'Can I make a card with my dog in it?', a: 'Yes. Upload a clear photo of their face — the paintings keep the fur colour, the markings and the shape of the face.' },
      { q: 'What can I make for a pet who has died?', a: 'There is a sympathy scene made for it. Many people print theirs and keep it at home rather than sending it.' },
      { q: 'What photo works best?', a: 'One where the face fills a decent part of the frame and the eyes are visible.' },
    ],
    cta: 'Make a card for your pet',
  },
]

export function getAudience(slug: string): AudienceDef | undefined {
  return AUDIENCES.find(a => a.slug === slug)
}

/** 落地页 URL */
export function audienceUrl(slug: string): string {
  return `/for/${slug}`
}
