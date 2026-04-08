import { loadGameState } from '../../api/game-state.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-2048-game-key-12345';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'No token' });

  try {
    const user = jwt.verify(auth, JWT_SECRET);
    const result = await loadGameState(user.id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
