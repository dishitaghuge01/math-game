import { Router, type NextFunction, type Request, type Response } from 'express';

import { applyDecision, resolveChoiceImpact } from '../services/gameStateService.js';

const router: ReturnType<typeof Router> = Router();

router.post('/decision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, userId, choiceId, choiceLabel, narrativeNodeId } = req.body ?? {};

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing required body field: sessionId' });
    }
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing required body field: userId' });
    }
    if (!choiceId || typeof choiceId !== 'string') {
      return res.status(400).json({ error: 'Missing required body field: choiceId' });
    }
    if (!choiceLabel || typeof choiceLabel !== 'string') {
      return res.status(400).json({ error: 'Missing required body field: choiceLabel' });
    }
    if (!narrativeNodeId || typeof narrativeNodeId !== 'string') {
      return res.status(400).json({ error: 'Missing required body field: narrativeNodeId' });
    }

    const result = await applyDecision(sessionId, userId, choiceId, choiceLabel, narrativeNodeId);
    return res.json(result);
  } catch (error) {
    if (error instanceof Error && typeof (error as Error & { status?: number }).status === 'number') {
      return res.status((error as Error & { status: number }).status).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
