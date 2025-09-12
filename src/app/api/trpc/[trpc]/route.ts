import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/routers';
import type { Context } from '@/lib/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: (): Context => {
      // Extract request information for Arcjet
      const url = new URL(req.url);
      const headers: Record<string, string> = {};
      
      // Convert headers to plain object
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        req,
        ip: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
        method: req.method,
        host: url.host,
        path: url.pathname,
        headers,
      };
    },
  });

export { handler as GET, handler as POST };
