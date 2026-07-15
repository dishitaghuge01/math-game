import { Router, type NextFunction, type Request, type Response } from 'express';

import { generateNarrativeNode } from '../../services/gameStateService.js';

const router: ReturnType<typeof Router> = Router();

router.get('/narrative/:nodeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nodeId = Array.isArray(req.params.nodeId) ? req.params.nodeId[0] : req.params.nodeId;
    const { sessionId } = req.query;

    if (!nodeId) {
      return res.status(400).json({ error: 'Missing required path parameter: nodeId' });
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing required query parameter: sessionId' });
    }

    const result = await generateNarrativeNode(sessionId, nodeId);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
