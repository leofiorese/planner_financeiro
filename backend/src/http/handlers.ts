import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so it can `return res.json(...)` (same style as
 * the original Next.js route handlers) and so rejected promises reach the
 * Express error handler.
 */
export function route(
  fn: (req: Request, res: Response) => Promise<unknown>,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Mirrors Next.js behaviour for HTTP methods a route does not implement:
 * 405 with an `Allow` header (OPTIONS answers 204).
 */
export function methodNotAllowed(allowed: string[]): RequestHandler {
  const allow = [...allowed, 'HEAD', 'OPTIONS'].join(', ');
  return (req: Request, res: Response) => {
    res.set('Allow', allow);
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    res.status(405).end();
  };
}

/**
 * Equivalent of `new URL(request.url).searchParams.get(name)`:
 * returns the first value as a string, or null when absent.
 */
export function queryParam(req: Request, name: string): string | null {
  const value = req.query[name];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}
