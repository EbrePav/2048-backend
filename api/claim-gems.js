// api/claim-gems.js
// Called by the Mini App on load to collect any pending gems

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ gems: 0 });

  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv');
    const key = `pending_gems:${userId}`;
    const pending = await kv.get(key) || 0;
    if (pending > 0) {
      await kv.del(key);
      return res.status(200).json({ gems: pending });
    }
  }

  return res.status(200).json({ gems: 0 });
}
