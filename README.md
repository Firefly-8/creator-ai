# Pulse — AI Music Studio

Personal Suno-like music site powered by **MiniMax Music API** (Token Plan).

## Features

- **Create**: Custom / Simple / Instrumental generation (`music-3.0`)
- **Lyrics**: Generate or edit via `/v1/lyrics_generation`
- **Cover**: Quick one-step + Advanced two-step preprocess + lyric edit
- **Library + Player**: Browse, play, download
- **Editor**: Browser-side crop, fade in/out, gain, WAV export (WaveSurfer + Web Audio)

## Setup

```bash
cp .env.example .env
# put your MiniMax API key in .env
npm install
npm run dev
```

Open http://localhost:3000

### Env

| Key | Description |
|---|---|
| `MINIMAX_API_KEY` | Required. Your Token Plan key |
| `MINIMAX_BASE_URL` | Default `https://api.minimax.io` |
| `APP_SECRET` | Optional. If set, API expects header `x-app-secret` |

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run preview` — preview production server

Audio files and SQLite live under `data/`.
