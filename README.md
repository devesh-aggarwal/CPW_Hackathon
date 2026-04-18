# Name Pronouncer

Tiny site: type a name, hear it pronounced (via Forvo).

## Setup

1. Get a Forvo API key: https://api.forvo.com/
2. (Optional) Get an ElevenLabs API key for the TTS fallback: https://elevenlabs.io/
3. Install + run:

```sh
npm install
FORVO_KEY=your_forvo_key ELEVENLABS_KEY=your_eleven_key npm start
```

You can also set `ELEVENLABS_VOICE` to override the default voice id.

3. Open http://localhost:3000

## How it works

- `public/index.html` — single-page UI.
- `server.js` — serves the page and proxies `/api/pronounce?name=…` to Forvo, so your API key stays on the server.
