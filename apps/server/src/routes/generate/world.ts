import { Router, type NextFunction, type Request, type Response } from 'express';

import { generateWorldChunk } from '../../services/gameStateService.js';

const router: ReturnType<typeof Router> = Router();

router.get('/world/:chunkId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chunkId = Array.isArray(req.params.chunkId) ? req.params.chunkId[0] : req.params.chunkId;
    const { sessionId } = req.query;

    if (!chunkId) {
      return res.status(400).json({ error: 'Missing required path parameter: chunkId' });
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing required query parameter: sessionId' });
    }

    const result = generateWorldChunk(sessionId, chunkId);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
