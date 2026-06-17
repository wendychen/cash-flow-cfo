import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const GOAL_COACH_PATH = '/api/goal-coach';

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function createVercelResponse(res: ServerResponse) {
  let statusCode = 200;
  const vercelRes = {
    setHeader(name: string, value: string) {
      res.setHeader(name, value);
      return vercelRes;
    },
    status(code: number) {
      statusCode = code;
      res.statusCode = code;
      return vercelRes;
    },
    json(body: unknown) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.statusCode = statusCode;
      res.end(JSON.stringify(body));
    },
  };
  return vercelRes;
}

export function goalCoachDevPlugin(): Plugin {
  return {
    name: 'goal-coach-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== GOAL_COACH_PATH) {
          next();
          return;
        }

        try {
          const { default: handler } = await import('../api/goal-coach');
          const body = await readJsonBody(req);
          await handler(
            { method: req.method, body },
            createVercelResponse(res)
          );
        } catch (error) {
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : 'Dev API error',
                code: 'dev_api_error',
              })
            );
          }
        }
      });
    },
  };
}