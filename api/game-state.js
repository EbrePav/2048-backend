// api/game-state.js
// Синхронизация состояния игры с Vercel KV

import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ============ HELPERS ============

function getServerTime() {
  return new Date().toISOString();
}

function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

function getSecondsUntilMidnightUTC() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((tomorrow - now) / 1000));
}

const DAILY_REWARDS = [
  { day: 1, gems: 25 },
  { day: 2, gems: 30 },
  { day: 3, gems: 50 },
  { day: 4, gems: 40 },
  { day: 5, gems: 60 },
  { day: 6, gems: 45 },
  { day: 7, gems: 100 }
];

// ============ LOAD STATE ============

export async function loadGameState(userId) {
  try {
    // Загружаем пользователя
    const user = await kv.hgetall(`user:${userId}`);
    
    if (!user || !user.id) {
      return { success: false, error: 'User not found' };
    }

    // Загружаем состояние игры
    const gameSession = await kv.get(`game:session:${userId}`);

    // Загружаем информацию о дневных наградах
    const dailyInfo = await getDailyRewardInfo(userId);

    return {
      success: true,
      user: {
        id: user.id,
        gems: parseInt(user.gems || 0),
        best_score: parseInt(user.best_score || 0)
      },
      game_session: gameSession ? JSON.parse(gameSession) : null,
      daily_reward: dailyInfo,
      server_time: getServerTime()
    };
  } catch (error) {
    console.error('Load state error:', error);
    return { success: false, error: error.message };
  }
}

// ============ SAVE STATE ============

export async function saveGameState(userId, gameData) {
  try {
    const { grid, falling, throws, score, gems } = gameData;

    // Валидация
    if (!grid || typeof throws !== 'number' || typeof score !== 'number') {
      return { success: false, error: 'Invalid game state' };
    }

    if (gems > 500) {
      return { success: false, error: 'Suspicious gem count' };
    }

    const gameState = JSON.stringify({ grid, falling, throws, score });
    
    // Сохраняем с TTL 24 часа
    await kv.setex(`game:session:${userId}`, 86400, gameState);

    // Получаем текущий баланс
    const user = await kv.hgetall(`user:${userId}`);
    const currentGems = parseInt(user?.gems || 0);

    return {
      success: true,
      gems_balance: currentGems,
      server_time: getServerTime()
    };
  } catch (error) {
    console.error('Save state error:', error);
    return { success: false, error: error.message };
  }
}

// ============ END SESSION ============

export async function endGameSession(userId, gameData) {
  try {
    const { final_score, gems_earned, duration_seconds } = gameData;

    if (gems_earned > 500) {
      return { success: false, error: 'Suspicious gem count' };
    }

    // Получаем пользователя
    const user = await kv.hgetall(`user:${userId}`);
    if (!user || !user.id) {
      return { success: false, error: 'User not found' };
    }

    const oldGems = parseInt(user.gems || 0);
    const newGems = oldGems + gems_earned;
    const oldBestScore = parseInt(user.best_score || 0);
    const newBestScore = Math.max(oldBestScore, final_score);
    const bestScoreUpdated = newBestScore > oldBestScore;

    // Обновляем пользователя
    await kv.hset(`user:${userId}`, {
      gems: newGems,
      best_score: newBestScore,
      updated_at: new Date().toISOString()
    });

    // Логируем транзакцию
    const transaction = {
      type: 'merge',
      gems_change: gems_earned,
      gems_before: oldGems,
      gems_after: newGems,
      score: final_score,
      duration: duration_seconds,
      timestamp: new Date().toISOString()
    };
    
    await kv.lpush(`user:${userId}:transactions`, JSON.stringify(transaction));

    // Очищаем игровую сессию
    await kv.del(`game:session:${userId}`);

    return {
      success: true,
      best_score_updated: bestScoreUpdated,
      new_best_score: newBestScore,
      total_gems: newGems
    };
  } catch (error) {
    console.error('End session error:', error);
    return { success: false, error: error.message };
  }
}

// ============ DAILY REWARDS ============

export async function getDailyRewardInfo(userId) {
  try {
    const today = getTodayUTC();

    // Инициализируем дневные награды если нужно
    const streak = await kv.hgetall(`user:${userId}:daily_streak`);
    
    if (!streak || !streak.current_day_index) {
      // Новый пользователь - начинаем с дня 1
      await kv.hset(`user:${userId}:daily_streak`, {
        last_claimed_date: today,
        current_day_index: 1,
        reset_date: today
      });
      
      const currentDay = 1;
      const reward = DAILY_REWARDS[0];
      
      return {
        current_day: currentDay,
        current_reward: reward.gems,
        can_claim: true,
        time_until_next: getSecondsUntilMidnightUTC(),
        claimed_today: false,
        can_watch_x2: true
      };
    }

    const currentDay = parseInt(streak.current_day_index);
    const lastClaimedDate = streak.last_claimed_date;
    const resetDate = streak.reset_date;

    // Проверяем, не новый ли день
    if (lastClaimedDate !== today && resetDate !== today) {
      // Проверяем перерыв
      const daysSinceLastClaim = Math.floor(
        (new Date(today) - new Date(lastClaimedDate)) / (1000 * 86400)
      );

      let nextDayIndex = currentDay;
      let newResetDate = resetDate;

      if (daysSinceLastClaim === 1) {
        // Продолжаем цикл
        nextDayIndex = (currentDay % 7) + 1;
      } else {
        // Сбрасываем на день 1
        nextDayIndex = 1;
        newResetDate = today;
      }

      await kv.hset(`user:${userId}:daily_streak`, {
        last_claimed_date: lastClaimedDate,
        current_day_index: nextDayIndex,
        reset_date: newResetDate
      });

      const reward = DAILY_REWARDS[nextDayIndex - 1];
      
      return {
        current_day: nextDayIndex,
        current_reward: reward.gems,
        can_claim: true,
        time_until_next: getSecondsUntilMidnightUTC(),
        claimed_today: false,
        can_watch_x2: true
      };
    }

    // Проверяем, получал ли уже сегодня
    const claimed = await kv.hgetall(`user:${userId}:daily:${today}`);
    const canClaim = !claimed || !claimed.claimed_at;

    const reward = DAILY_REWARDS[currentDay - 1];

    return {
      current_day: currentDay,
      current_reward: reward.gems,
      can_claim: canClaim,
      time_until_next: getSecondsUntilMidnightUTC(),
      claimed_today: !canClaim,
      can_watch_x2: canClaim
    };
  } catch (error) {
    console.error('Get daily info error:', error);
    return {
      current_day: 1,
      current_reward: 25,
      can_claim: false,
      time_until_next: 0,
      claimed_today: true,
      can_watch_x2: false
    };
  }
}

export async function claimDailyReward(userId, withX2) {
  try {
    const today = getTodayUTC();

    // Получаем текущий день
    const streak = await kv.hgetall(`user:${userId}:daily_streak`);
    if (!streak || !streak.current_day_index) {
      await kv.hset(`user:${userId}:daily_streak`, {
        last_claimed_date: today,
        current_day_index: 1,
        reset_date: today
      });
    }

    const currentDay = parseInt(streak?.current_day_index || 1);

    // Проверяем, не получал ли уже
    const claimed = await kv.hgetall(`user:${userId}:daily:${today}`);
    
    if (claimed && claimed.claimed_at) {
      return {
        success: false,
        error: 'already_claimed_today',
        time_until_next: getSecondsUntilMidnightUTC()
      };
    }

    // Получаем размер награды
    const rewardData = DAILY_REWARDS[currentDay - 1];
    let gemsToAdd = rewardData.gems;
    
    if (withX2) {
      gemsToAdd *= 2;
    }

    // Обновляем баланс пользователя
    const user = await kv.hgetall(`user:${userId}`);
    const oldGems = parseInt(user?.gems || 0);
    const newGems = oldGems + gemsToAdd;

    await kv.hset(`user:${userId}`, {
      gems: newGems,
      updated_at: new Date().toISOString()
    });

    // Отмечаем награду как полученную
    await kv.hset(`user:${userId}:daily:${today}`, {
      claimed_at: new Date().toISOString(),
      claimed_with_x2: withX2 ? 1 : 0,
      day: currentDay,
      gems: gemsToAdd
    });

    // Обновляем последнюю дату получения награды
    await kv.hset(`user:${userId}:daily_streak`, {
      last_claimed_date: today
    });

    // Логируем транзакцию
    const transaction = {
      type: 'daily_reward',
      gems_change: gemsToAdd,
      gems_before: oldGems,
      gems_after: newGems,
      day: currentDay,
      with_x2: withX2,
      timestamp: new Date().toISOString()
    };
    
    await kv.lpush(`user:${userId}:transactions`, JSON.stringify(transaction));

    const isLastDay = currentDay === 7;

    return {
      success: true,
      gems_received: gemsToAdd,
      next_claim_in_seconds: getSecondsUntilMidnightUTC(),
      day_completed: currentDay,
      is_last_day: isLastDay,
      new_daily_cycle: !isLastDay,
      total_gems: newGems
    };
  } catch (error) {
    console.error('Claim daily reward error:', error);
    return { success: false, error: error.message };
  }
}
