import { Router, type NextFunction, type Request, type Response } from 'express';
import { paletteFromVector } from '@math-game/asset-gen';

import * as sessionStore from '../../services/sessionStore.js';

const router: ReturnType<typeof Router> = Router();

router.get('/palette', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing required query parameter: sessionId' });
    }

    const session = sessionStore.getOrCreateSession(sessionId, sessionId);
    return res.json({ palette: paletteFromVector(session.vector) });
  } catch (error) {
    next(error);
  }
});

export default router;
