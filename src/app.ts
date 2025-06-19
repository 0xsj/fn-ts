import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { contextMiddleware, responseLoggerMiddleware } from './shared/middleware';
import { ResponseBuilder } from './shared/response';
import { logger } from './shared/utils/logger';

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(contextMiddleware)
app.use(responseLoggerMiddleware)

app.use((req: Request, _res: Response, next) => {
  logger.info({
    ...req.context.toLogContext(),
    userAgent: req.get('user-agent'),
  }, 'Incoming Request');
  next();
});


app.get('/health', (req: Request, res: Response) => {
  const response = ResponseBuilder.ok(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    req.context.correlationId
  );
  
  req.context.setResponse(response);
  response.send(res);
});


app.get('/', (req: Request, res: Response) => {
  const response = ResponseBuilder.ok(
    {
      message: 'foo',
      version: '1.0.0',
    },
    req.context.correlationId
  );
  
  req.context.setResponse(response);
  response.send(res);
});

app.use((req: Request, res: Response) => {
  const { NotFoundError } = require('./shared/response');
  const error = new NotFoundError(
    'The requested resource was not found',
    req.context.correlationId
  );
  req.context.setResponse(error);
  error.send(res);
});


export default app;
