// Must be the first import: loads backend/.env before anything reads process.env.
import { env } from './config/env';

import express, { type NextFunction, type Request, type Response } from 'express';
import { planRouter } from './routes/plan';
import { carRouter } from './routes/car';
import { wishlistRouter } from './routes/wishlist';

const app = express();

app.disable('x-powered-by');
// Responses are always fresh data from MySQL; avoid 304s from ETag revalidation.
app.set('etag', false);

// The full UserPlan is posted on every save (~100 KB today), above Express' 100 KB default.
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/plan', planRouter);
app.use('/api/car', carRouter);
app.use('/api/wishlist', wishlistRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { type?: string; status?: number };
  if (e && e.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  if (e && e.type === 'entity.too.large') {
    res.status(413).json({ error: 'Payload Too Large' });
    return;
  }
  console.error('Unhandled API error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const server = app.listen(env.port, () => {
  console.log(`Backend listening on http://${env.host}:${env.port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} is already in use. Set PORT in backend/.env or free the port.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});
