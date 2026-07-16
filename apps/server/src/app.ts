import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';

import decisionRouter from './routes/decision.js';
import expeditionsRouter from './routes/expeditions.js';
import gameRouter from './routes/game.js';
import mechanicsRouter from './routes/generate/mechanics.js';
import narrativeRouter from './routes/generate/narrative.js';
import paletteRouter from './routes/generate/palette.js';
import worldRouter from './routes/generate/world.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || (corsOrigin && origin === corsOrigin) || (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin))) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  }));

  app.use('/', decisionRouter);
  app.use('/', expeditionsRouter);
  app.use('/', gameRouter);
  app.use('/generate', worldRouter);
  app.use('/generate', narrativeRouter);
  app.use('/generate', mechanicsRouter);
  app.use('/generate', paletteRouter);
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = typeof error === 'object' && error !== null && 'status' in error && typeof (error as { status?: number }).status === 'number' ? (error as { status: number }).status : 500;
    res.status(status).json({ error: message });
  });
  return app;
}
