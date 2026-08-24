import { createApp } from "./app.js";

export interface Env {
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  ENVIRONMENT?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const app = createApp(env as unknown as Record<string, unknown>);
    return app.fetch(request, env, ctx);
  },
};
