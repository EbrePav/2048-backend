export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.KV_REST_API_URL) {
    return res.status(500).json({ error: 'KV not configured' });
  }

  const { kv } = await import('@vercel/kv');

  // GET — топ игроков
  if (req.method === 'GET') {
    try {
      const entries = await kv.zrange('leaderboard', 0, 49, {
        rev: true,
        withScores: true
      });

      const players = [];

      for (let i = 0; i < entries.length; i += 2) {
        const userId = entries[i];
        const score = entries[i + 1];

        const name = await kv.hget(`user:${userId}`, 'name') || 'Player';

        players.push({
          userId,
          name,
          score: Number(score)
        });
      }

      return res.status(200).json({ players });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — отправка результата
  if (req.method === 'POST') {
    const { userId, name, score } = req.body;

    if (!userId || !name || score === undefined) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    try {
      // сохраняем лучший результат
      const current = await kv.zscore('leaderboard', userId) || 0;

      if (score > current) {
        await kv.zadd('leaderboard', { score, member: userId });
        await kv.hset(`user:${userId}`, { name });
      }

      const rank = await kv.zrank('leaderboard', userId, { rev: true });

      return res.status(200).json({
        ok: true,
        rank: rank + 1
      });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}