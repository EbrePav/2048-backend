// api/index.js
// Главный файл маршрутов

import { handleLoadState, handleSaveState, handleEndSession, handleDailyRewardInfo, handleClaimDailyReward } from './game-routes.js';

export default async function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Game State маршруты
  if (pathname === '/api/game/load-state' && req.method === 'POST') {
    return handleLoadState(req);
  }

  if (pathname === '/api/game/save-state' && req.method === 'POST') {
    return handleSaveState(req);
  }

  if (pathname === '/api/game/end-session' && req.method === 'POST') {
    return handleEndSession(req);
  }

  if (pathname === '/api/daily-reward/info' && req.method === 'GET') {
    return handleDailyRewardInfo(req);
  }

  if (pathname === '/api/daily-reward/claim' && req.method === 'POST') {
    return handleClaimDailyReward(req);
  }

  // 404
  return res.status(404).json({ error: 'Not found' });
}
