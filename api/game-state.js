// Simple in-memory database
const db = new Map();

export async function loadGameState(userId) {
  const user = db.get(`user:${userId}`) || { id: userId, gems: 100, best_score: 0 };
  return {
    success: true,
    user: user,
    game_session: null,
    daily_reward: { current_day: 1, current_reward: 25, can_claim: true, time_until_next: 86400 },
    server_time: new Date().toISOString()
  };
}

export async function saveGameState(userId, gameData) {
  return { success: true, gems_balance: 100, server_time: new Date().toISOString() };
}

export async function endGameSession(userId, gameData) {
  const user = db.get(`user:${userId}`) || { id: userId, gems: 0, best_score: 0 };
  user.gems += gameData.gems_earned || 0;
  user.best_score = Math.max(user.best_score, gameData.final_score || 0);
  db.set(`user:${userId}`, user);
  
  return { success: true, best_score_updated: true, new_best_score: user.best_score, total_gems: user.gems };
}

export async function getDailyRewardInfo(userId) {
  return { current_day: 1, current_reward: 25, can_claim: true, time_until_next: 86400, claimed_today: false, can_watch_x2: true };
}

export async function claimDailyReward(userId, withX2) {
  return { success: true, gems_received: 25, total_gems: 125 };
}
