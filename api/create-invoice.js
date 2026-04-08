// api/create-invoice.js — Vercel Serverless Function
// Creates a Telegram Stars invoice link

export default async function handler(req, res) {
  // Allow CORS from your Mini App
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { itemId, userId } = req.body;
  if (!itemId || !userId) return res.status(400).json({ error: 'Missing itemId or userId' });

  const ITEMS = {
    gems100_first: { title: '100 кристаллов',  description: '100 💎 для игры 2048 Drop — скидка первой покупки!', amount: 5,   gems: 100  },
    gems100:       { title: '100 кристаллов',  description: '100 💎 для игры 2048 Drop',                          amount: 10,  gems: 100  },
    gems200:       { title: '200 кристаллов',  description: '200 💎 для игры 2048 Drop',                          amount: 18,  gems: 200  },
    gems500:       { title: '500 кристаллов',  description: '500 💎 для игры 2048 Drop — популярный пакет!',      amount: 45,  gems: 500  },
    gems1000:      { title: '1000 кристаллов', description: '1000 💎 для игры 2048 Drop — лучшая цена!',          amount: 90,  gems: 1000 },
  };

  const item = ITEMS[itemId];
  if (!item) return res.status(400).json({ error: 'Unknown item' });

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) return res.status(500).json({ error: 'BOT_TOKEN not configured' });

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.title,
        description: item.description,
        payload: JSON.stringify({ itemId, userId, gems: item.gems }),
        currency: 'XTR', // Telegram Stars
        prices: [{ label: item.title, amount: item.amount }],
      }),
    });

    const data = await response.json();
    if (!data.ok) return res.status(500).json({ error: data.description });
    return res.status(200).json({ invoiceUrl: data.result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
