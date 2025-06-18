import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from './shared/utils/logger';

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next) => {
  logger.info(
    {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
    },
    'Incoming Request',
  );
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'foo',
    version: '1.0.0',
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

export default app;
