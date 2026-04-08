// api/game-routes.js
// API маршруты для синхронизации состояния игры

import { loadGameState, saveGameState, endGameSession, getDailyRewardInfo, claimDailyReward } from './game-state.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ============ MIDDLEWARE ============

function authenticateToken(req) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return { success: false, error: 'No token provided', status: 401 };
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Invalid token', status: 403 };
  }
}

// ============ 1. LOAD STATE ============

export async function handleLoadState(req) {
  const auth = authenticateToken(req);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status });
  }

  const result = await loadGameState(auth.user.id);
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============ 2. SAVE STATE ============

export async function handleSaveState(req) {
  const auth = authenticateToken(req);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status });
  }

  const gameData = await req.json();
  const result = await saveGameState(auth.user.id, gameData);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============ 3. END SESSION ============

export async function handleEndSession(req) {
  const auth = authenticateToken(req);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status });
  }

  const gameData = await req.json();
  const result = await endGameSession(auth.user.id, gameData);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============ 4. DAILY REWARD INFO ============

export async function handleDailyRewardInfo(req) {
  const auth = authenticateToken(req);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status });
  }

  const dailyInfo = await getDailyRewardInfo(auth.user.id);
  
  return new Response(JSON.stringify({
    ...dailyInfo,
    server_time: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============ 5. CLAIM DAILY REWARD ============

export async function handleClaimDailyReward(req) {
  const auth = authenticateToken(req);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status });
  }

  const { with_x2 } = await req.json();
  const result = await claimDailyReward(auth.user.id, with_x2 === true);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
