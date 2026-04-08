import fs from 'fs';
import path from 'path';

// Используем /tmp которая сохраняется между перезагрузками на Railway
const dbFile = '/tmp/game-db.json';

function loadDB() {
  try {
    if (fs.existsSync(dbFile)) {
      const data = fs.readFileSync(dbFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('DB load error:', e);
  }
  return {};
}

function saveDB(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('DB saved');
  } catch (e) {
    console.error('DB save error:', e);
  }
}

export async function loadGameState(userId) {
  const db = loadDB();
  let user = db[`user:${userId}`];
  
  if (!user) {
    user = { id: userId, gems: 100, best_score: 0 };
    db[`user:${userId}`] = user;
    saveDB(db);
  }
  
  const session = db[`session:${userId}`];
  return {
    success: true,
    user: user,
    game_session: session ? JSON.parse(session) : null,
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
  
  const user = db[`user:${userId}`] || { gems: 0 };
  return { success: true, gems_balance: user.gems, server_time: new Date().toISOString() };
}

export async function endGameSession(userId, gameData) {
  const db = loadDB();
  let user = db[`user:${userId}`] || { id: userId, gems: 0, best_score: 0 };
  
  user.gems = Math.max(0, user.gems); // Не падать ниже 0
  const newBest = Math.max(user.best_score || 0, gameData.final_score || 0);
  user.best_score = newBest;
  
  db[`user:${userId}`] = user;
  delete db[`session:${userId}`];
  saveDB(db);
  
  return { 
    success: true, 
    best_score_updated: newBest > (user.best_score || 0),
    new_best_score: newBest, 
    total_gems: user.gems 
  };
}

export async function getDailyRewardInfo(userId) {
  const db = loadDB();
  const today = new Date().toISOString().split('T')[0];
  const claimedKey = `daily:${userId}:${today}`;
  const claimed = db[claimedKey];
  
  return { 
    current_day: 1, 
    current_reward: 25, 
    can_claim: !claimed,
    time_until_next: claimed ? 0 : 86400,
    claimed_today: !!claimed
  };
}

export async function claimDailyReward(userId, withX2) {
  const db = loadDB();
  const today = new Date().toISOString().split('T')[0];
  const claimedKey = `daily:${userId}:${today}`;
  
  if (db[claimedKey]) {
    return { success: false, error: 'Already claimed today' };
  }
  
  let user = db[`user:${userId}`] || { id: userId, gems: 0, best_score: 0 };
  const gems = withX2 ? 50 : 25;
  user.gems += gems;
  
  db[`user:${userId}`] = user;
  db[claimedKey] = true;
  saveDB(db);
  
  return { success: true, gems_received: gems, total_gems: user.gems };
}
