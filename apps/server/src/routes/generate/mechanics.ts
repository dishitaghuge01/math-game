import { Router, type NextFunction, type Request, type Response } from 'express';

import { getMechanicsPayload } from '../../services/gameStateService';

const router: ReturnType<typeof Router> = Router();

router.get('/mechanics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, baseDifficulty } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing required query parameter: sessionId' });
    }

    const parsedBaseDifficulty = baseDifficulty === undefined ? 5 : Number(baseDifficulty);
    if (!Number.isFinite(parsedBaseDifficulty)) {
      return res.status(400).json({ error: 'Invalid query parameter: baseDifficulty' });
    }

    const result = getMechanicsPayload(sessionId, parsedBaseDifficulty);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
