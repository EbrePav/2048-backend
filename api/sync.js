import { loadGameState, saveGameState, endGameSession, getDailyRewardInfo, claimDailyReward } from './game-state.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-2048-game-key-12345';

function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return { success: false, error: 'No token', status: 401 };
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Invalid token', status: 403 };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  const auth = authenticateToken(req);

  if (pathname === '/api/game/load-state' && req.method === 'POST') {
    if (!auth.success) return res.status(auth.status).json({ error: auth.error });
    const result = await loadGameState(auth.user.id);
    return res.status(result.success ? 200 : 400).json(result);
  }

  if (pathname === '/api/game/save-state' && req.method === 'POST') {
    if (!auth.success) return res.status(auth.status).json({ error: auth.error });
    const result = await saveGameState(auth.user.id, req.body);
    return res.status(result.success ? 200 : 400).json(result);
  }

  if (pathname === '/api/game/end-session' && req.method === 'POST') {
    if (!auth.success) return res.status(auth.status).json({ error: auth.error });
    const result = await endGameSession(auth.user.id, req.body);
    return res.status(result.success ? 200 : 400).json(result);
  }

  if (pathname === '/api/daily-reward/info' && req.method === 'GET') {
    if (!auth.success) return res.status(auth.status).json({ error: auth.error });
    const dailyInfo = await getDailyRewardInfo(auth.user.id);
    return res.status(200).json({ ...dailyInfo, server_time: new Date().toISOString() });
  }

  if (pathname === '/api/daily-reward/claim' && req.method === 'POST') {
    if (!auth.success) return res.status(auth.status).json({ error: auth.error });
    const result = await claimDailyReward(auth.user.id, req.body.with_x2 === true);
    return res.status(result.success ? 200 : 400).json(result);
  }

  return res.status(404).json({ error: 'Not found' });
}
