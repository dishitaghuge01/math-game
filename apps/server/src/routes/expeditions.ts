import { randomUUID } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { applyExpeditionAction, exportExpeditionCode, importExpeditionCode, isExpeditionAction, loadExpedition, startExpedition, type ExpeditionAction } from '../services/expeditionService.js';

const router: ReturnType<typeof Router> = Router();

router.post('/expeditions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { expeditionId = randomUUID(), worldSeed } = req.body ?? {};
    if (typeof expeditionId !== 'string' || (worldSeed !== undefined && (!Number.isInteger(worldSeed) || worldSeed < 1))) {
      return res.status(400).json({ error: 'Invalid expeditionId or worldSeed' });
    }
    return res.status(201).json(startExpedition(expeditionId, worldSeed));
  } catch (error) {
    next(error);
  }
});

router.post('/expeditions/:expeditionId/actions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const expeditionId = Array.isArray(req.params.expeditionId) ? req.params.expeditionId[0] : req.params.expeditionId;
    const action = req.body as ExpeditionAction;
    if (!isExpeditionAction(action)) return res.status(400).json({ error: 'Invalid Expedition action' });
    return res.json(applyExpeditionAction(expeditionId, action));
  } catch (error) {
    next(error);
  }
});

router.get('/expeditions/:expeditionId/code', (req: Request, res: Response, next: NextFunction) => {
  try {
    const expeditionId = Array.isArray(req.params.expeditionId) ? req.params.expeditionId[0] : req.params.expeditionId;
    return res.json({ code: exportExpeditionCode(expeditionId) });
  } catch (error) {
    next(error);
  }
});

router.post('/expeditions/import', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { expeditionId = randomUUID(), code } = req.body ?? {};
    if (typeof expeditionId !== 'string' || typeof code !== 'string') return res.status(400).json({ error: 'Invalid expeditionId or Expedition Code' });
    return res.status(201).json(importExpeditionCode(expeditionId, code));
  } catch (error) {
    next(error);
  }
});

router.get('/expeditions/:expeditionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const expeditionId = Array.isArray(req.params.expeditionId) ? req.params.expeditionId[0] : req.params.expeditionId;
    const state = loadExpedition(expeditionId);
    return state ? res.json(state) : res.status(404).json({ error: 'Expedition not found' });
  } catch (error) {
    next(error);
  }
});

export default router;
