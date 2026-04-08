import express from 'express';
import { loadGameState } from './api/game-state.js';

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Simple auth - любой токен принимаем
app.post('/api/game/load-state', (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1] || req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  
  const userId = auth.includes('user-') ? auth.split('user-')[1] : auth;
  loadGameState(userId).then(result => {
    res.status(result.success ? 200 : 400).json(result);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
