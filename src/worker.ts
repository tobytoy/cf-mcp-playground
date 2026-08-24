import { createApp } from "./app.js";
import type { McpApp } from "./app.js";
import type { AppEnv } from "./types/env.js";

// App is created once at module scope so Cloudflare's isolate reuses the
// same cache instance across all incoming requests within the same isolate.
let app: McpApp | null = null;

export type { AppEnv as Env };

export default {
  async fetch(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
    if (!app) app = createApp(env);
    return app.fetch(request, env, ctx);
  },
};
