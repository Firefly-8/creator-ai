export type SongPublic = {
  id: string
  title: string
  prompt: string
  lyrics: string
  model: string
  type: string
  status: string
  durationMs: number
  coverColor: string
  coverUrl: string | null
  errorMessage: string | null
  parentId: string | null
  audioUrl: string | null
  downloadUrl: string | null
  meta: any
  createdAt: string
  updatedAt: string
}

export type JobPublic = {
  id: string
  type: string
  status: 'queued' | 'generating' | 'downloading' | 'done' | 'error'
  progress: string
  songId: string | null
  errorMessage: string | null
  result: any
  createdAt: string
  updatedAt: string
}

export function formatDuration(ms: number) {
  if (!ms || ms < 0) return '0:00'
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const LYRIC_TAGS = [
  'Intro',
  'Verse',
  'Pre Chorus',
  'Chorus',
  'Post Chorus',
  'Bridge',
  'Hook',
  'Break',
  'Interlude',
  'Inst',
  'Solo',
  'Outro',
]
