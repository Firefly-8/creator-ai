export type SongPreset = {
  id: string
  label: string
  /** Compact chip title shown in marquee */
  shortLabel: string
  /** Scene / mood / genre category like Suno/Musicful tags */
  category: 'Scene' | 'Mood' | 'Genre' | 'Energy' | 'Sleep'
  /** Phosphor icon class without i- prefix, e.g. ph-cloud-rain */
  icon: string
  title?: string
  mode?: 'custom' | 'simple' | 'instrumental'
  /**
   * Music-generation `prompt` — follow MiniMax Music 3.0 guidance:
   * Chinese prompts for MiniMax Music 3.0 — concrete instruments, techniques, arrangement, mood.
   * Official examples prefer descriptive prose over English marketing blurbs.
   */
  prompt: string
  /** Lyrics-generation `prompt` (write_full_song). Used when applying vocal presets. */
  lyricsHint?: string
}

/**
 * Curated presets tuned for MiniMax music-3.0 + lyrics_generation.
 * Vocal presets → custom mode + auto lyrics (official recommendation: write lyrics first, then arrange)
 * Instrumental → is_instrumental + required Chinese prompt
 */
export const SONG_PRESETS: SongPreset[] = [
  {
    id: 'rainy-day',
    label: 'Rainy Day Song',
    shortLabel: 'Rainy Day',
    category: 'Scene',
    icon: 'ph-cloud-rain',
    title: 'Sleepless Rainy Night',
    mode: 'custom',
    prompt:
      '忧郁独立流行（Indie Pop），适合下雨的夜晚独自听。柔和直立钢琴铺底，远处潮湿的电吉他延音与轻微反馈，极轻的刷片与心跳般的底鼓。人声亲密靠前、气声明显，咬字温柔，副歌叠一层细薄和声。速度约 72 BPM，温暖 Lo-fi 混音，空间感像雨打窗玻璃，怀旧而克制，不要嘈杂电子音。',
    lyricsHint:
      '写一首适合雨天夜里听的中文抒情歌。意象围绕雨声、窗玻璃上的水痕、路灯、潮湿的街道与说不出口的思念。结构完整：含 [Verse] [Pre Chorus] [Chorus] [Bridge] [Outro]，副歌可跟唱，不要堆砌网络热梗。',
  },
  {
    id: 'running',
    label: 'Running Beat',
    shortLabel: 'Running',
    category: 'Energy',
    icon: 'ph-person-simple-run',
    title: 'Keep Moving',
    mode: 'custom',
    prompt:
      '高能量跑步电子流行（Electronic Pop），驱动感强。清晰四拍底鼓与拍手，弹性贝斯线，明亮合成器主音与切分节奏型吉他。人声有力、咬字干净，副歌口号感强、适合跟着喊。速度约 128 BPM，现代干净混音，前冲感与肾上腺素，避免过度失真与脏乱低频。',
    lyricsHint:
      '写一首适合跑步燃脂时听的励志中文流行歌。节奏感强，歌词短句有力，副歌简洁重复、容易跟唱。结构含 [Verse] [Pre Chorus] [Chorus] [Bridge] [Chorus]，主题是坚持、呼吸、脚步与突破自己，不要鸡汤口号堆砌。',
  },
  {
    id: 'like-tianxia',
    label: 'Epic Like Tianxia',
    shortLabel: 'Epic Ballad',
    category: 'Genre',
    icon: 'ph-mountains',
    title: 'Mountains & Rivers',
    mode: 'custom',
    prompt:
      '史诗感华语流行摇滚（Mandopop Power Ballad / Pop-Rock），气质接近经典家国叙事歌曲：前奏钢琴或木吉他铺陈，主歌克制，副歌电吉他与鼓组全面推起，宽混响合唱与激情男声高音。可加入弦乐垫底与军鼓滚奏。速度约 82–88 BPM，副歌爆发、咬字清晰有力，英雄感与悲壮并存，唱片级层次，不要电子舞曲节奏。',
    lyricsHint:
      '写一首气势磅礴的原创中文流行摇滚歌词，气质接近《天下》那种山河、命运与个人担当交织的史诗感，但绝不可抄袭原词或原曲名句。结构含 [Verse] [Pre Chorus] [Chorus] [Verse] [Chorus] [Bridge] [Chorus]，副歌要有爆发力与可合唱的短句。',
  },
  {
    id: 'night-drive',
    label: 'Night Drive Loop',
    shortLabel: 'Night Drive',
    category: 'Scene',
    icon: 'ph-car-profile',
    title: 'Midnight Drive',
    mode: 'custom',
    prompt:
      '深夜开车 Synthwave / Chill Electronic。霓虹城市夜色，稳定律动约 100 BPM，深沉低频与空灵合成器 Pad，细碎 hi-hat，偶尔出现录音带暖噪。人声偏气声或轻声吟唱，旋律催眠、适合循环。混音干净宽阔，像高速公路车灯拖影，避免轰炸式 Drop。',
    lyricsHint:
      '写一首适合深夜开车循环听的中文歌。氛围感强，歌词偏意象：夜路、车窗、霓虹、电台与孤独。结构含 [Verse] [Chorus] [Verse] [Chorus] [Bridge] [Outro]，副歌简短重复、便于循环，不要叙事过满。',
  },
  {
    id: 'breakup',
    label: 'Post-Breakup Tears',
    shortLabel: 'Breakup',
    category: 'Mood',
    icon: 'ph-heart-break',
    title: 'Unsent Letter',
    mode: 'custom',
    prompt:
      '情绪浓郁的华语抒情流行（Mandopop Ballad）。稀疏钢琴前奏，主歌几乎只有人声与钢琴，副歌缓缓加入弦乐与轻鼓。人声脆弱、近麦、有呼吸与细微破音，速度约 68 BPM。电影感悲伤，结尾略带回甘，不要夸张哭腔与过度电子铺底。',
    lyricsHint:
      '写一首分手后听的中文抒情歌。真挚克制，像写给旧人却未寄出的信。结构含 [Verse] [Pre Chorus] [Chorus] [Verse] [Chorus] [Bridge] [Outro]，副歌有泪点但不煽情过头，避免网络烂梗与脏话。',
  },
  {
    id: 'cafe',
    label: 'Café Afternoon',
    shortLabel: 'Café',
    category: 'Scene',
    icon: 'ph-coffee',
    title: 'Slow Sunshine',
    mode: 'custom',
    prompt:
      '午后咖啡馆独立民谣（Indie Folk）。木吉他指弹清晰，轻刷鼓与极轻的贝斯，可加一点手风琴或口琴点缀。人声温暖松弛、笑容感，速度约 96 BPM。阳光、木质桌面与咖啡香气的舒适氛围，混音自然留白，不要重鼓与合成器轰炸。',
    lyricsHint:
      '写一首轻松温暖的咖啡馆下午中文歌。小叙事、小幸福：阳光、窗边座位、慢喝的咖啡与偶然的好心情。结构含 [Verse] [Chorus] [Verse] [Chorus] [Bridge] [Outro]，语言生活化、画面感强。',
  },
  {
    id: 'gym',
    label: 'Gym Burner',
    shortLabel: 'Gym EDM',
    category: 'Energy',
    icon: 'ph-barbell',
    title: 'No Limit',
    mode: 'instrumental',
    prompt:
      '健身房燃脂纯电音（Future Bass / Gym EDM Instrumental），无人声。重型侧链低音、清晰冲击的 Kick，副歌大 Drop：失真低音、明亮合成器 Lead 与噪声扫频。速度约 150 BPM，结构有 Build-up 与 Drop 对比，适合 HIIT 与力量训练。混音有冲击力但避免刺耳高频，不要人声采样歌词。',
  },
  {
    id: 'guofeng',
    label: 'Guofeng Saga',
    shortLabel: 'Guofeng',
    category: 'Genre',
    icon: 'ph-sword',
    title: 'Deep in Clouds',
    mode: 'custom',
    prompt:
      '古风仙侠国风融合流行（Guofeng Cinematic Pop）。竹笛与古筝主题动机清晰，现代鼓组与电影感弦乐推进，可加琵琶扫弦与空灵合唱垫底。女声空灵、咬字典雅，旋律有山水意境。速度约 78 BPM，神秘而侠义，副歌开阔，不要纯电子舞曲节奏，也不要过于戏腔。',
    lyricsHint:
      '写一首古风仙侠主题曲中文歌词。意境空灵：云深、剑意、江湖路与命运羁绊。结构含 [Verse] [Pre Chorus] [Chorus] [Verse] [Chorus] [Bridge] [Outro]，文言意象与现代可唱性兼顾，不要堆砌生僻字到无法演唱。',
  },
  {
    id: 'sleep',
    label: 'Sleep Ambient',
    shortLabel: 'Sleep',
    category: 'Sleep',
    icon: 'ph-moon-stars',
    title: 'Soft Horizon',
    mode: 'instrumental',
    prompt:
      '睡前助眠氛围纯音乐（Sleep Ambient Instrumental），无人声。极柔软的合成器 Pad 与缓慢钢琴动机，几乎无打击乐，最多保留极轻的心跳式脉冲。速度约 52–58 BPM，音量起伏小，治愈、失重、无惊吓瞬态。避免尖锐高频、突然 Drop 与节奏强烈的鼓点。',
  },
  {
    id: 'party',
    label: 'Weekend Party',
    shortLabel: 'Party',
    category: 'Energy',
    icon: 'ph-disco-ball',
    title: 'Lights On',
    mode: 'custom',
    prompt:
      '周末派对舞蹈流行（Dance-Pop）。四拍底鼓约 124 BPM，闪亮合成器 Lead、拍手与短促铜管/合成铜管点缀，贝斯有弹性。人声自信明亮，副歌 Hook 强、适合跟唱与蹦迪。混音俱乐部感、高频清晰，不要 Melancholy 抒情，也不要过度重金属失真。',
    lyricsHint:
      '写一首周末派对热歌中文歌词。快乐、释放、灯光与舞池。结构含 [Verse] [Pre Chorus] [Chorus] [Verse] [Chorus] [Bridge] [Chorus]，副歌洗脑、短句重复，适合跟着喊，语言轻快口语化。',
  },
  {
    id: 'healing-folk',
    label: 'Healing Folk',
    shortLabel: 'Healing',
    category: 'Mood',
    icon: 'ph-plant',
    title: 'Take It Slow',
    mode: 'custom',
    prompt:
      '治愈系华语民谣（Chinese Acoustic Folk）。指弹吉他为主，轻口琴或木笛点缀，极轻刷鼓。人声亲密像朋友低语，房间感自然混响，速度约 84 BPM。温暖真诚、留白充足，不要电音铺底与大编制弦乐轰炸。',
    lyricsHint:
      '写一首治愈系中文民谣。像朋友轻声安慰：慢慢来、没关系、日子会亮。结构含 [Verse] [Chorus] [Verse] [Chorus] [Bridge] [Outro]，画面感强（路边树、晚风、一杯热水），语言朴素动人。',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk Night',
    shortLabel: 'Cyberpunk',
    category: 'Genre',
    icon: 'ph-cpu',
    title: 'Neon Rain',
    mode: 'custom',
    prompt:
      '赛博朋克夜城（Darksynth + Alt-R&B）。雨夜霓虹，故障纹理与颗粒采样点缀，深沉合成低音，主歌半拍律动约 110 BPM，副歌紧张推进。人声偏冷感 Alt-R&B，可加轻微声码器层，咬字清晰。科技孤独感，混音黑暗宽阔，避免廉价游戏音效堆砌。',
    lyricsHint:
      '写一首赛博朋克夜城氛围中文歌。科技感与孤独并存：全息广告、雨夜街道、芯片心跳与找不到归处的人。结构含 [Verse] [Pre Chorus] [Chorus] [Verse] [Chorus] [Bridge] [Outro]，意象现代、可唱，不要英文堆砌过半。',
  },
]

export function splitPresetRows(presets: SongPreset[] = SONG_PRESETS) {
  const rowA: SongPreset[] = []
  const rowB: SongPreset[] = []
  presets.forEach((p, i) => (i % 2 === 0 ? rowA : rowB).push(p))
  // Keep rows visually dense even with odd counts
  if (rowB.length < 4) rowB.push(...rowA.slice(0, 4 - rowB.length))
  return { rowA, rowB }
}
