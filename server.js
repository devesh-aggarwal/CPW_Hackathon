import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;
const FORVO_KEY = process.env.FORVO_KEY;
const ELEVENLABS_KEY = process.env.ELEVENLABS_KEY;
const ELEVENLABS_VOICE = process.env.ELEVENLABS_VOICE || "21m00Tcm4TlvDq8ikWAM";

if (!FORVO_KEY) {
  console.warn("FORVO_KEY env var not set — /api/pronounce will return 500.");
}
if (!ELEVENLABS_KEY) {
  console.warn("ELEVENLABS_KEY env var not set — TTS fallback disabled.");
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/pronounce", async (req, res) => {
  const name = (req.query.name || "").trim();
  if (!name) return res.status(400).json({ error: "missing name" });
  if (!FORVO_KEY) return res.status(500).json({ error: "server missing FORVO_KEY" });

  const base = `https://apifree.forvo.com/key/${encodeURIComponent(FORVO_KEY)}/format/json`;
  const pronUrl = `${base}/action/word-pronunciations/word/${encodeURIComponent(name)}/order/rate-desc/limit/5`;
  const phonUrl = `${base}/action/word-phonetics/word/${encodeURIComponent(name)}`;

  try {
    const [pronR, phonR] = await Promise.all([fetch(pronUrl), fetch(phonUrl)]);
    if (!pronR.ok) return res.status(502).json({ error: `forvo ${pronR.status}` });
    const pronData = await pronR.json().catch(() => ({}));
    const phonData = phonR.ok ? await phonR.json().catch(() => ({})) : {};

    const items = (pronData.items || []).map((i) => ({
      username: i.username,
      country: i.country,
      rate: i.rate,
      mp3: i.pathmp3,
      ogg: i.pathogg,
    }));
    const phonetics = (phonData.items || []).map((p) => ({
      alphabet: p.alphabet,
      transcription: p.transcription,
    }));
    const ttsUrl =
      items.length === 0 && ELEVENLABS_KEY
        ? `/api/tts?name=${encodeURIComponent(name)}`
        : null;
    res.json({ items, phonetics, ttsUrl });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/tts", async (req, res) => {
  const name = (req.query.name || "").trim();
  if (!name) return res.status(400).json({ error: "missing name" });
  if (!ELEVENLABS_KEY) return res.status(500).json({ error: "server missing ELEVENLABS_KEY" });

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVENLABS_VOICE)}`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_KEY,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: name,
        model_id: "eleven_multilingual_v2",
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      return res.status(502).json({ error: `elevenlabs ${r.status}: ${body}` });
    }
    res.setHeader("content-type", "audio/mpeg");
    res.setHeader("cache-control", "public, max-age=3600");
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
