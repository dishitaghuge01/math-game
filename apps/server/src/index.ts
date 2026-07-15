import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';

import decisionRouter from './routes/decision';
import worldRouter from './routes/generate/world';
import narrativeRouter from './routes/generate/narrative';
import mechanicsRouter from './routes/generate/mechanics';

const app = express();
app.use(express.json());

app.use('/', decisionRouter);
app.use('/generate', worldRouter);
app.use('/generate', narrativeRouter);
app.use('/generate', mechanicsRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status = typeof error === 'object' && error !== null && 'status' in error && typeof (error as { status?: number }).status === 'number'
    ? (error as { status: number }).status
    : 500;

  res.status(status).json({ error: message });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
