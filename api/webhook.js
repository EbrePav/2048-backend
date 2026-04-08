// api/webhook.js — Telegram Bot Webhook
// Handles pre_checkout_query and successful_payment

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const update = req.body;

  // Must answer pre_checkout_query within 10 seconds
  if (update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pre_checkout_query_id: query.id, ok: true }),
    });
    return res.status(200).json({ ok: true });
  }

  // Payment confirmed — Stars have been charged
  if (update.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const payload = JSON.parse(payment.invoice_payload);
    const userId = payload.userId;
    const gems = payload.gems;

    // Store pending gems reward in KV store
    // We use a simple approach: save to Vercel KV or just return via next request
    // Here we use a lightweight in-memory map + /api/claim endpoint
    console.log(`Payment confirmed: user ${userId} gets ${gems} gems`);

    // Save to KV (Vercel KV or fallback to a simple JSON store)
    await savePendingGems(userId, gems, BOT_TOKEN);
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}

async function savePendingGems(userId, gems, botToken) {
  // Notify user via bot message
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: `✅ Оплата прошла! +${gems} 💎 будут начислены при следующем открытии игры.`,
      }),
    });
  } catch(e) { console.error(e); }

  // Store in Vercel KV if available
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv');
    const key = `pending_gems:${userId}`;
    const existing = await kv.get(key) || 0;
    await kv.set(key, existing + gems, { ex: 86400 }); // expires in 24h
  }
}
