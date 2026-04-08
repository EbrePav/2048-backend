import fs from 'fs';

const dbFile = '/tmp/game-db.json';

function loadDB() {
  try {
    if (fs.existsSync(dbFile)) {
      return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

export async function loadGameState(userId) {
  const db = loadDB();
  const user = db[`user:${userId}`];
  
  // Если пользователя нет - создаём впервые с 100 gems
  if (!user) {
    const newUser = { id: userId, gems: 100, best_score: 0 };
    db[`user:${userId}`] = newUser;
    saveDB(db);
    return {
      success: true,
      user: newUser,
      game_session: null,
      daily_reward: { current_day: 1, current_reward: 25, can_claim: true, time_until_next: 86400 },
      server_time: new Date().toISOString()
    };
  }
  
  // Если пользователь есть - возвращаем его данные
  const session = db[`session:${userId}`];
  return {
    success: true,
    user: user,
    game_session: session ? JSON.parse(session) : null,
    daily_reward: { current_day: 1, current_reward: 25, can_claim: true, time_until_next: 86400 },
    server_time: new Date().toISOString()
  };
}

export async function saveGameState(userId, gameData) {
  const db = loadDB();
  db[`session:${userId}`] = JSON.stringify({
    grid: gameData.grid,
    falling: gameData.falling,
    throws: gameData.throws,
    score: gameData.score
  });
  saveDB(db);
  
  const user = db[`user:${userId}`];
  return { success: true, gems_balance: user.gems, server_time: new Date().toISOString() };
}

export async function endGameSession(userId, gameData) {
  const db = loadDB();
  let user = db[`user:${userId}`];
  
  if (!user) {
    user = { id: userId, gems: 0, best_score: 0 };
  }
  
  user.gems += gameData.gems_earned || 0;
  user.best_score = Math.max(user.best_score, gameData.final_score || 0);
  
  db[`user:${userId}`] = user;
  delete db[`session:${userId}`];
  saveDB(db);
  
  return { success: true, best_score_updated: true, new_best_score: user.best_score, total_gems: user.gems };
}

export async function getDailyRewardInfo(userId) {
  return { current_day: 1, current_reward: 25, can_claim: true, time_until_next: 86400, claimed_today: false };
}

export async function claimDailyReward(userId, withX2) {
  const db = loadDB();
  let user = db[`user:${userId}`];
  
  if (!user) {
    user = { id: userId, gems: 0, best_score: 0 };
  }
  
  const gems = withX2 ? 50 : 25;
  user.gems += gems;
  db[`user:${userId}`] = user;
  saveDB(db);
  
  return { success: true, gems_received: gems, total_gems: user.gems };
}
