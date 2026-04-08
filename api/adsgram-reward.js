export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const userId = req.query.userId;
  if (!userId || userId === '[userId]') {
    return res.status(400).json({ ok: false, error: 'Missing userId' });
  }

  console.log(`AdsGram reward: user ${userId} watched ad`);

  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv');
      const key = `pending_gems:${userId}`;
      const existing = await kv.get(key) || 0;
      await kv.set(key, existing + 25, { ex: 86400 }); // 25 gems now
    } catch(e) { console.error('KV error:', e); }
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (BOT_TOKEN) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userId,
          text: `✅ Реклама переглянута! +25 💎 буде нараховано при наступному відкритті гри.`,
        }),
      });
    } catch(e) {}
  }

  return res.status(200).json({ ok: true });
}
