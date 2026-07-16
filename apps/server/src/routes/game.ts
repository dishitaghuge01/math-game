import { Router, type NextFunction, type Request, type Response } from 'express';

import { applyGameAction, getRpgGame } from '../services/rpgGameService.js';

const router: ReturnType<typeof Router> = Router();

router.get('/game', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'Missing required query parameter: sessionId' });
    return res.json(getRpgGame(sessionId));
  } catch (error) {
    next(error);
  }
});

router.post('/game/action', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, action } = req.body ?? {};
    if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'Missing required body field: sessionId' });
    if (!action || typeof action !== 'object' || !['move', 'combat', 'reset'].includes(action.type)) {
      return res.status(400).json({ error: 'Invalid game action' });
    }
    return res.json(applyGameAction(sessionId, action));
  } catch (error) {
    next(error);
  }
});

export default router;
