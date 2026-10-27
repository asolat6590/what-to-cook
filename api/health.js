export default function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({ ok: true, hasKey: Boolean(process.env.GEMINI_API_KEY?.trim()) });
}
