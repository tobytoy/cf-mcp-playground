export interface Env {
  // Bindings
  ASSISTANT_KV?: KVNamespace;

  // Environment Variables
  ENVIRONMENT?: string;
  NEEDLE_API_URL?: string;
  NEEDLE_API_KEY?: string;
  GOOGLE_SHEET_APP_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
  // Secrets
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  ALLOWED_USER_ID?: string;
  GEMINI_API_KEY: string;
  TAVILY_API_KEY?: string;
  CWA_API_KEY?: string;
  OPENAI_API_KEY?: string;
}
export type GeminiModel =
  | "gemini-3.8-flash"
  | "gemini-3.7-flash"
  | "gemini-3.6-flash"
  | "gemini-3.5-flash"
  | "gemini-2.5-flash"
  | "gemini-3.5-flash-lite"
  | "gemini-3.1-flash-lite"
  | "gemma-4-31b-it";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface RoutingResult {
  tool: string;
  arguments: Record<string, unknown>;
  confidence: number;
  reasoning?: string;
  target_model?: GeminiModel;
}
