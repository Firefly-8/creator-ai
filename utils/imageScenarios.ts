/**
 * 场景化生图库 —— Create Keepsakes
 * 目标人群：海外中老年人（使用者）+ 他们的子女（付费者）
 *
 * 设计原则（和面向设计师的工具站完全不同）：
 *   1. 用户不写 prompt，只「选场景 → 选画风 → 填个称呼」；prompt 由服务端拼
 *   2. 场景名用大白话英文，不用 "Logo / UI / 产品图" 这类专业词
 *   3. 场景按「给谁 / 为什么」分组，而不是按节日分类
 *      —— 中老年用户的心智是「给妈妈做张生日卡」，不是「按节日挑模板」
 *   4. 能少填就少填，多数场景零输入即可出图
 *   5. 画风词分两种状态：
 *      - proven: true  → 实测过「画风能压过参考图 / 风格能生效」
 *      - 未标 proven    → 词表来自竞品在用风格，**上线前必须实测**
 *
 * 画风词踩过的坑（scripts/test-i2i-consistency.py 实测）：
 *   - 开 prompt_optimizer 会把 watercolor / anime 压成照片风 → 参考图场景默认关优化器
 *   - 技术规格式描述（如 "32x32 retro game sprite"）反而失效 → 避免这类写法
 *   - pixel-art 实测失败且偶发「双犬拼接」畸形 → 已从库中剔除
 *
 * ⚠️ 商标 / 品牌相关：见 docs/plan-overhaul-senior-cards-landscape.md §6.5.1
 */

export type ScenarioGroup =
  | 'birthday'
  | 'family'
  | 'kindness'
  | 'holiday'
  | 'wallart'
  | 'memory'

export interface ImageStyleDef {
  id: string
  /** 英文名，给用户看的 */
  label: string
  /** 英文画风描述，拼进 prompt */
  prompt: string
  /** 实测过画风能生效 */
  proven?: boolean
  /**
   * 能否在「有参考图」（i2i）场景使用。
   *
   * 实测结论（2026-10-20，5 画风 × t2i/i2i 对照）：
   * 参考图会强烈压制画风 —— sepia / vintage-postcard 在 t2i 下完美，
   * 在 i2i 下分别「完全失效」和「只半生效」；
   * impressionist 虽生效，但会改写主体特征（狗换了一只）。
   * 只有 photo / watercolor / oil / oil-pastel / paper-cut / vintage-color / cartoon
   * 在两种模式下都稳定。
   */
  i2iSafe?: boolean
}

export interface ImageScenarioDef {
  id: string
  /** 大白话场景名（英文） */
  label: string
  /** 一句话说明"这是干什么用的" */
  desc: string
  icon: string
  group: ScenarioGroup
  /**
   * 是否需要在画面上方预留标题空间。
   *
   * 我们的成品是「AI 画画面 + 我们排文字」，
   * 所以带文字的场景必须让出干净区域；纯装饰画（墙画/风景）则满幅。
   */
  headlineSpace?: boolean
  /** 是否需要上传照片（传了就是 i2i 主体参考） */
  needReference: boolean
  aspectRatio: string
  count: number
  /** 该场景可选的画风 id；不填则用全部 */
  styles?: string[]
  /**
   * prompt 模板。支持占位符：
   *   {name}  —— 用户填的名字/称呼
   *   {style} —— 画风描述
   *   {extra} —— 补充描述
   */
  template: string
  /** 场景关键词，追加到 prompt 尾部 */
  keywords?: string
  /** 输入框提示 */
  inputHint?: string
  /** 该场景是否需要用户填点什么 */
  askName?: boolean
  /** 预设祝贺语（AI 不可用时的兜底，也给用户直接选） */
  presetMessages?: string[]
}

/* ------------------------------------------------------------------ */
/* 画风库                                                               */
/* ------------------------------------------------------------------ */

export const IMAGE_STYLES: ImageStyleDef[] = [
  {
    id: 'photo',
    label: 'Photograph',
    prompt: 'photorealistic photograph, natural skin tones, sharp focus, professional photography, high detail',
    proven: true,
    i2iSafe: true,
  },
  {
    id: 'watercolor',
    label: 'Watercolour',
    prompt: 'watercolor painting, soft wet brush strokes, visible paper texture, pastel colors, hand painted illustration',
    proven: true,
    i2iSafe: true,
  },
  {
    id: 'oil',
    label: 'Oil Painting',
    prompt: 'oil painting on canvas, thick impasto brush strokes, rich oil colors, museum fine art portrait',
    proven: true,
    i2iSafe: true,
  },
  {
    id: 'oil-pastel',
    label: 'Oil Pastel',
    prompt: 'oil pastel drawing on textured paper, soft chalky strokes, gentle blended colors, nostalgic handmade feel',
    proven: true,
    i2iSafe: true,
  },
  {
    id: 'vintage-postcard',
    label: 'Vintage Postcard',
    prompt: 'vintage postcard illustration, faded retro colors, halftone print texture, weathered paper edges, 1950s travel poster style',
    proven: true,
  },
  {
    id: 'paper-cut',
    label: 'Paper Cut',
    prompt: 'paper cut art, layered construction paper silhouettes, clean bold shapes, soft drop shadows, folk art style',
    proven: true,
    i2iSafe: true,
  },
  {
    id: 'impressionist',
    label: 'Impressionist',
    prompt: 'impressionist oil painting, loose visible brushwork, luminous broken color, plein air light, museum quality',
    proven: true,
  },
  {
    id: 'vintage-color',
    label: 'Colourised Photo',
    prompt: 'restored vintage color photograph, colorized, sharp focus, natural skin tones, fine grain, 1960s family photograph, archival quality',
    proven: true,
    i2iSafe: true,
  },
  {
    id: 'sepia',
    label: 'Sepia',
    prompt: 'sepia toned vintage photograph, warm brown monochrome, soft vignette, aged film grain, antique photographic print',
    proven: true,
  },
  {
    id: 'cartoon',
    label: 'Cartoon',
    prompt: 'cute cartoon illustration, bold clean outlines, simple flat shapes, cheerful bright colors, storybook style',
    proven: true,
    i2iSafe: true,
  },
]

export function getStyle(id: string): ImageStyleDef | undefined {
  return IMAGE_STYLES.find(s => s.id === id)
}

/* ------------------------------------------------------------------ */
/* 场景库                                                               */
/* ------------------------------------------------------------------ */

export const IMAGE_SCENARIOS: ImageScenarioDef[] = [
  /* ============ Birthdays & Milestones ============ */
  {
    id: 'birthday',
    label: 'Birthday',
    desc: 'For a birthday, any age',
    icon: 'ph-cake',
    group: 'birthday',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['photo', 'watercolor', 'oil-pastel', 'vintage-postcard', 'paper-cut', 'cartoon'],
    template:
      'A warm birthday greeting picture for {name}, {style}, a beautifully decorated cake with lit candles, balloons and confetti, festive bunting, golden warm light, joyful and full of love',
    keywords: 'birthday, celebration, cake, candles, balloons, festive, warm light',
    askName: true,
    inputHint: 'Who is it for? e.g. Margaret, Dad, Grandpa Jim',
    presetMessages: [
      'Wishing you a very happy birthday!',
      'Happy Birthday — may this year be your best one yet.',
      'So proud of you. Happy Birthday!',
      'Thinking of you today. Have the best birthday.',
    ],
  },
  {
    id: 'milestone',
    label: 'Milestone Birthday',
    desc: '60th, 70th, 80th — a big one',
    icon: 'ph-medal',
    group: 'birthday',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['photo', 'oil', 'oil-pastel', 'vintage-postcard', 'watercolor'],
    template:
      'A grand milestone birthday celebration for {name}, {style}, elegant golden balloons, champagne glasses, cascading flowers, gold and cream luxury palette, deeply sentimental and dignified',
    keywords: 'milestone, anniversary, jubilee, golden, celebration, elegant',
    askName: true,
    inputHint: 'Name and milestone, e.g. Margaret 70',
    presetMessages: [
      'Happy 70th Birthday, Margaret! What a life you have lived.',
      'Congratulations on this wonderful milestone. So well loved.',
      'Seventy looks wonderful on you. Happy Birthday!',
    ],
  },
  {
    id: 'parents-day',
    label: 'Mother\'s or Father\'s Day',
    desc: 'For Mum or Dad',
    icon: 'ph-flower-lotus',
    group: 'birthday',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['watercolor', 'oil', 'oil-pastel', 'vintage-postcard', 'photo'],
    template:
      "A tender Mother\'s or Father\'s Day greeting picture for {name}, {style}, a lush garden of roses and carnations, soft morning sunlight, lace and linen textures, warm and deeply grateful",
    keywords: 'parents day, flowers, roses, carnations, garden, gratitude, soft light',
    askName: true,
    inputHint: 'e.g. Mum, Dad, Grandma',
    presetMessages: [
      'Thank you for everything you have done for us.',
      'Happy Mother\'s Day. We love you more than you know.',
      'You have always been the heart of our family.',
    ],
  },

  /* ============ Family & Life ============ */
  {
    id: 'wedding',
    label: 'Wedding & Anniversary',
    desc: 'A wedding or a long marriage',
    icon: 'ph-heart',
    group: 'family',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['watercolor', 'oil', 'vintage-postcard', 'paper-cut', 'photo'],
    template:
      'A romantic wedding and anniversary greeting for {name}, {style}, delicate white lace and ribbons, champagne gold accents, soft roses, elegant and timeless',
    keywords: 'wedding, anniversary, love, rings, lace, champagne, elegant',
    askName: true,
    inputHint: 'Names, e.g. Margaret & Tom',
    presetMessages: [
      'Congratulations on your beautiful day.',
      'Wishing you a lifetime of happiness together.',
      'So happy for you both. Love always.',
    ],
  },
  {
    id: 'new-baby',
    label: 'New Baby',
    desc: 'A new grandchild',
    icon: 'ph-baby',
    group: 'family',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['watercolor', 'cartoon', 'paper-cut', 'oil-pastel', 'photo'],
    template:
      'A sweet new baby greeting for {name}, {style}, soft clouds and gentle stars, a knitted blanket, warm pastel nursery palette, tender and joyful',
    keywords: 'new baby, welcome, nursery, pastel, blessing, new life',
    askName: true,
    inputHint: "Baby's name, e.g. Oliver",
    presetMessages: [
      'Congratulations on the new arrival!',
      'Welcome little one. We are so happy for you.',
      'A whole new heart to love.',
    ],
  },
  {
    id: 'graduation',
    label: 'Graduation',
    desc: 'Proud of a grandchild',
    icon: 'ph-graduation-cap',
    group: 'family',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['photo', 'oil', 'vintage-postcard', 'watercolor', 'paper-cut'],
    template:
      'A proud graduation celebration for {name}, {style}, a mortarboard with tassel, rolled diploma, warm university stone buildings, sunny sky, quietly proud and dignified',
    keywords: 'graduation, diploma, achievement, proud, celebration, academic',
    askName: true,
    inputHint: 'Their name, e.g. Sarah',
    presetMessages: [
      'So proud of you. Congratulations!',
      'You did it! We are all so proud.',
      'Hard work paid off. Well done.',
    ],
  },
  {
    id: 'retirement',
    label: 'Retirement',
    desc: 'Farewell to a colleague or friend',
    icon: 'ph-coffee',
    group: 'family',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['oil-pastel', 'oil', 'watercolor', 'vintage-postcard', 'photo'],
    template:
      'A warm retirement and farewell celebration for {name}, {style}, a beach sunset over calm water, a well-loved gardening chair, a glass of champagne, freedom and gratitude in the air',
    keywords: 'retirement, farewell, happy retirement, new chapter, freedom, grateful',
    askName: true,
    inputHint: 'Name, e.g. Frank',
    presetMessages: [
      'Happy Retirement! Enjoy every day of it.',
      'Wishing you a wonderful next chapter.',
      'Thank you for everything. You will be missed.',
    ],
  },

  /* ============ Everyday Kindness ============ */
  {
    id: 'thank-you',
    label: 'Thank You',
    desc: 'Say thank you properly',
    icon: 'ph-heart',
    group: 'kindness',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['watercolor', 'oil-pastel', 'photo', 'vintage-postcard', 'paper-cut'],
    template:
      'A heartfelt thank you greeting for {name}, {style}, a simple table with a bunch of wildflowers and a warm cup of tea, gentle natural light, sincere and understated',
    keywords: 'thank you, gratitude, sincere, kindness, warm, heartfelt',
    askName: true,
    inputHint: 'Who are you thanking? e.g. Helen',
    presetMessages: [
      'Thank you for everything you did for me.',
      'I could not have done it without you. Thank you.',
      'Just a small note to say — thank you.',
    ],
  },
  {
    id: 'get-well',
    label: 'Get Well Soon',
    desc: 'Thinking of them while unwell',
    icon: 'ph-first-aid',
    group: 'kindness',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['watercolor', 'paper-cut', 'oil-pastel', 'photo', 'vintage-postcard'],
    template:
      'A gentle get well soon message for {name}, {style}, a bedside window with soft morning light, a small vase of spring flowers, calm muted palette, quiet and caring',
    keywords: 'get well, recovery, comfort, caring, calm, gentle',
    askName: true,
    inputHint: 'Their name, e.g. George',
    presetMessages: [
      'Get well soon. Thinking of you.',
      'Sending you healing thoughts. Get well soon!',
      'Hope you are feeling better very soon.',
    ],
  },
  {
    id: 'sympathy',
    label: 'Sympathy',
    desc: 'In loving memory',
    icon: 'ph-flower-tulip',
    group: 'kindness',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['paper-cut', 'watercolor', 'oil-pastel', 'vintage-postcard', 'photo'],
    template:
      'A quiet and dignified sympathy tribute for {name}, {style}, soft white lilies and a single candle, muted dove grey and ivory palette, peaceful and respectful, no bright colours',
    keywords: 'sympathy, remembrance, in loving memory, dignity, peaceful, tribute',
    askName: true,
    inputHint: "Their name, e.g. John",
    presetMessages: [
      'In loving memory. You will be missed.',
      'With deepest sympathy. Holding you in our thoughts.',
      'Forever in our hearts.',
    ],
  },

  /* ============ Holidays ============ */
  {
    id: 'christmas',
    label: 'Christmas',
    desc: 'The biggest season of the year',
    icon: 'ph-tree',
    group: 'holiday',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['photo', 'oil-pastel', 'vintage-postcard', 'watercolor', 'paper-cut'],
    template:
      'A magical Christmas greeting picture for {name}, {style}, a beautifully decorated Christmas tree glowing with warm lights, snow falling gently outside a cottage window, deep red and forest green and gold, cosy winter evening',
    keywords: 'christmas, holiday, snow, tree, lights, festive, cosy winter',
    askName: true,
    inputHint: 'Name on the card, e.g. Margaret',
    presetMessages: [
      'Merry Christmas! Wishing you a wonderful season.',
      'Thinking of you this Christmas. Love always.',
      'May your Christmas be warm and full of joy.',
    ],
  },
  {
    id: 'easter',
    label: 'Easter',
    desc: 'Spring, family and new beginnings',
    icon: 'ph-egg',
    group: 'holiday',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['watercolor', 'oil-pastel', 'paper-cut', 'photo', 'vintage-postcard'],
    template:
      'A bright spring Easter greeting for {name}, {style}, decorated eggs, spring blossom branches, daffodils and lambs, soft pastel spring palette, fresh and hopeful',
    keywords: 'easter, spring, blossom, pastel, new beginnings, family',
    askName: true,
    inputHint: 'Name, e.g. Anne',
    presetMessages: [
      'Happy Easter! Wishing you a lovely spring.',
      'Thinking of you this Easter. All the family send their love.',
      'Hope you have a wonderful day.',
    ],
  },
  {
    id: 'hanukkah',
    label: 'Hanukkah',
    desc: 'Festival of lights',
    icon: 'ph-flame',
    group: 'holiday',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['photo', 'oil-pastel', 'vintage-postcard', 'paper-cut', 'watercolor'],
    template:
      'A warm Hanukkah greeting for {name}, {style}, a menorah with glowing candles, dreidels and a star of david, deep blue night sky, golden candlelight, festive and reverent',
    keywords: 'hanukkah, festival of lights, menorah, candles, blue and gold, celebration',
    askName: true,
    inputHint: 'Name, e.g. David',
    presetMessages: [
      'Happy Hanukkah! May your lights shine bright.',
      'Wishing you a wonderful Festival of Lights.',
      'Warmest wishes for Hanukkah.',
    ],
  },
  {
    id: 'diwali',
    label: 'Diwali',
    desc: 'Festival of lights',
    icon: 'ph-fire',
    group: 'holiday',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['oil-pastel', 'vintage-postcard', 'watercolor', 'photo', 'paper-cut'],
    template:
      'A radiant Diwali greeting for {name}, {style}, rows of lit diyas, rangoli patterns, marigold garlands, deep indigo night with golden lights, joyful and colourful',
    keywords: 'diwali, diyas, rangoli, marigold, lights, celebration, colourful',
    askName: true,
    inputHint: 'Name, e.g. Priya',
    presetMessages: [
      'Happy Diwali! May your life be lit with joy.',
      'Wishing you a wonderful Diwali filled with light.',
      'Warmest Diwali wishes to you and your family.',
    ],
  },
  {
    id: 'lunar-new-year',
    label: 'Lunar New Year',
    desc: 'Chinese New Year',
    icon: 'ph-confetti',
    group: 'holiday',
    needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['oil-pastel', 'vintage-postcard', 'watercolor', 'photo', 'paper-cut'],
    template:
      'A festive Lunar New Year greeting for {name}, {style}, red lanterns, plum blossom branches, paper cut decorations, lucky red and gold palette, fireworks in the night sky, joyful and auspicious',
    keywords: 'lunar new year, chinese new year, lanterns, red and gold, fireworks, auspicious',
    askName: true,
    inputHint: 'Name, e.g. Mrs Chen',
    presetMessages: [
      'Happy Lunar New Year! Wishing you prosperity and health.',
      'May the new year bring you joy and good fortune.',
      'Gong Hei Fat Choi! Best wishes to you and your family.',
    ],
  },

  /* ============ Wall Art ============ */
  {
    id: 'hometown',
    label: 'My Hometown',
    desc: 'The place you grew up',
    icon: 'ph-house-line',
    group: 'wallart',
        headlineSpace: false,
needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['impressionist', 'oil', 'watercolor', 'vintage-postcard', 'photo'],
    template:
      'A nostalgic painting of a small hometown street, {style}, a row of old stone and brick houses, a church spire in the distance, quiet tree-lined road, warm late afternoon light, deeply nostalgic and timeless',
    keywords: 'hometown, village, street, church spire, nostalgia, heritage',
    askName: false,
  },
  {
    id: 'holiday-place',
    label: 'A Place I Loved',
    desc: 'A trip you still think about',
    icon: 'ph-sailboat',
    group: 'wallart',
        headlineSpace: false,
needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['impressionist', 'oil', 'watercolor', 'vintage-postcard', 'photo'],
    template:
      'A beautiful painting of a holiday destination, {style}, a sweeping coastline with a distant headland, sailboats on calm water, cypress trees, golden Mediterranean light, peaceful travel memory',
    keywords: 'travel, coastline, memories, golden light, landscape, destination',
    askName: false,
  },
  {
    id: 'our-home',
    label: 'Our Home',
    desc: 'The house, as it should be',
    icon: 'ph-house',
    group: 'wallart',
        headlineSpace: false,
needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['impressionist', 'oil', 'watercolor', 'photo', 'vintage-postcard'],
    template:
      'A warm painting of a beloved family home, {style}, a stone cottage with a red door and window boxes full of flowers, a garden path, soft afternoon sunlight, safe and welcoming',
    keywords: 'home, cottage, garden, family, warmth, belonging',
    askName: false,
  },
  {
    id: 'garden',
    label: 'The Garden',
    desc: 'Flowers they love',
    icon: 'ph-flower-tulip',
    group: 'wallart',
        headlineSpace: false,
needReference: false,
    aspectRatio: '3:4',
    count: 4,
    styles: ['impressionist', 'watercolor', 'oil', 'photo', 'oil-pastel'],
    template:
      'A luminous painting of a flourishing garden, {style}, overflowing flower borders, roses and lavender and ivy, a weathered wooden bench, morning light through the leaves, serene and abundant',
    keywords: 'garden, flowers, roses, lavender, bench, morning light, abundance',
    askName: false,
  },
  {
    id: 'four-seasons',
    label: 'Four Seasons',
    desc: 'One picture, four seasons',
    icon: 'ph-tree-evergreen',
    group: 'wallart',
        headlineSpace: false,
needReference: false,
    aspectRatio: '1:1',
    count: 4,
    styles: ['impressionist', 'oil', 'watercolor', 'paper-cut', 'vintage-postcard'],
    template:
      'A four seasons landscape painting of the same countryside scene, {style}, spring blossom, summer meadow, autumn harvest gold, winter snow, harmonious palette, classic wall art',
    keywords: 'four seasons, landscape, spring, summer, autumn, winter, wall art',
    askName: false,
  },

  /* ============ Photos & Portraits ============ */
  {
    id: 'restore-old-photo',
    label: 'Restore an Old Photo',
    desc: 'Faded and black & white, made new',
    icon: 'ph-image-square',
    group: 'memory',
    needReference: true,
    aspectRatio: '3:4',
    count: 4,
    styles: ['vintage-color', 'photo', 'oil-pastel', 'watercolor'],
    template:
      'The same photograph from the reference, restored and colorized, {style}, clean sharp detail, natural colours, no blur, no scratches, faces preserved exactly as they were, archival restoration quality',
    keywords: 'restoration, colorization, old photograph, memory, faces preserved',
    askName: false,
  },
  {
    id: 'family-reunion',
    label: 'Family Reunion',
    desc: 'A class, a reunion, a big family',
    icon: 'ph-users-three',
    group: 'memory',
    needReference: true,
    aspectRatio: '3:4',
    count: 4,
    styles: ['photo', 'oil', 'vintage-color', 'watercolor'],
    template:
      'A warm family reunion portrait of the same people from the reference photo, {style}, gathered together outdoors in soft golden light, natural relaxed expressions, everyone recognisable, joyful and nostalgic',
    keywords: 'family, reunion, gathering, together, nostalgia, golden light',
    askName: false,
  },
  {
    id: 'pet',
    label: 'My Dog or Cat',
    desc: 'A beloved companion',
    icon: 'ph-paw-print',
    group: 'memory',
    needReference: true,
    aspectRatio: '1:1',
    count: 4,
    styles: ['photo', 'watercolor', 'oil', 'cartoon', 'oil-pastel'],
    template:
      'A beautiful portrait of the same pet from the reference photo, {style}, faithful to their markings and colouring, looking directly at the camera, soft studio light, warm and charming',
    keywords: 'pet, portrait, dog, cat, faithful likeness, warm',
    askName: false,
  },
]

export const SCENARIO_GROUPS: { id: ScenarioGroup; label: string; icon: string }[] = [
  { id: 'birthday', label: 'Birthdays & Milestones', icon: 'ph-cake' },
  { id: 'family', label: 'Family & Life', icon: 'ph-users-three' },
  { id: 'kindness', label: 'Everyday Kindness', icon: 'ph-heart' },
  { id: 'holiday', label: 'Holidays', icon: 'ph-calendar-heart' },
  { id: 'wallart', label: 'Wall Art', icon: 'ph-palette' },
  { id: 'memory', label: 'Photos & Pets', icon: 'ph-clock-counter-clockwise' },
]

export function getScenario(id: string): ImageScenarioDef | undefined {
  return IMAGE_SCENARIOS.find(s => s.id === id)
}

/**
 * 某个场景在给定模式下可用的画风
 *
 * ⚠️ 关键约束：有参考图（i2i）时，强画风会改写主体特征
 *    （实测 impressionist 把参考图里的狗换成了另一只）。
 *    所以 i2i 场景必须只给 i2iSafe 的画风。
 *
 * @param scenario 场景
 * @param hasReference 是否会传参考图
 */
export function stylesForScenario(
  scenario: ImageScenarioDef | undefined,
  hasReference: boolean
): ImageStyleDef[] {
  if (!scenario) return IMAGE_STYLES
  const ids = scenario.styles?.length ? scenario.styles : IMAGE_STYLES.map(s => s.id)
  const allowed = hasReference
    ? ids.filter(id => getStyle(id)?.i2iSafe)
    : ids
  const list = allowed.map(id => getStyle(id)).filter(Boolean) as ImageStyleDef[]
  return list.length ? list : [getStyle('photo')!]
}

/**
 * 拼装最终 prompt
 * @param scenarioId 场景 id
 * @param styleId    画风 id
 * @param name       用户填的名字/称呼
 * @param extra      用户的补充描述
 */
export function buildScenarioPrompt(
  scenarioId: string,
  styleId: string,
  name = '',
  extra = ''
): { prompt: string; scenario: ImageScenarioDef; style: ImageStyleDef } | null {
  const scenario = getScenario(scenarioId)
  if (!scenario) return null
  const style = getStyle(styleId) || IMAGE_STYLES[0]

  const subject = name.trim() || extra.trim() || 'someone special'
  let prompt = scenario.template
    .replace(/\{name\}/g, subject)
    .replace(/\{style\}/g, style.prompt)
    .replace(/\{extra\}/g, extra.trim() || subject)

  // 自由创作场景没填内容时给个能看懂的兜底，别让用户对着空图发呆
  if (scenario.id === 'free' && !name.trim() && !extra.trim()) {
    prompt = 'A beautiful scenic landscape, {style}, serene atmosphere, rich colors, high detail'
      .replace('{style}', style.prompt)
  }

  const keywords = scenario.keywords ? `, ${scenario.keywords}` : ''

  // ⚠️ 负面约束是硬需求，不是锦上添花。
  // 实测（2026-10-20，showcase 12 张）：模型在画面里自己写字必翻车 ——
  // 出现过 "Happy 70th Runthdscket"、歪掉的 "get well soon"。
  // 我们的成品是「AI 画画面 + 我们排文字」，模型写一个字就等于砸招牌。
  prompt += NO_TEXT_CLAUSE

  // 给标题留白：成品要把「Happy Birthday / 名字」排在上面，
  // 画面上方必须干净（除非是满幅装饰画）。
  if (scenario.headlineSpace !== false) {
    prompt += HEADLINE_SPACE_CLAUSE
  }

  return { prompt: `${prompt}${keywords}`, scenario, style }
}

/** 画面里不允许出现任何文字/数字/签名（实测：不加就会自己写字） */
export const NO_TEXT_CLAUSE =
  ', no text, no lettering, no words, no numbers, no captions, no signage, no watermark, no signature, no logo'

/** 上方 1/3 留白，供成品排版标题与称呼 */
export const HEADLINE_SPACE_CLAUSE =
  ', generous empty space in the upper third, clean and uncluttered, soft light background there'
