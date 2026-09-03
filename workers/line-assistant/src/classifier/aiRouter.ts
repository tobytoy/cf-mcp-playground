import type { RoutingResult, GeminiModel } from "../types/env";
import { ASSISTANT_TOOLS } from "./tools";
import { ModelLoadBalancer } from "../tools/modelPool";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export class AiRouter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Determine the most suitable Gemini / Gemma model based on query complexity with load balancing.
   */
  pickTargetModel(prompt: string, intentTool: string = "ask_llm"): GeminiModel {
    // 1. Math calculation or Search synthesis -> High intelligence model pool (Load balanced)
    if (intentTool === "calculator" || intentTool === "search_web") {
      return ModelLoadBalancer.pickNextModel("strong") as GeminiModel;
    }

    // 2. Code / Complex reasoning / Multi-step logic -> High intelligence model pool (Load balanced)
    if (
      /(程式碼|寫一個|代碼|debug|演算法|架構|分析|推導|深入解釋|原理|code|typescript|python|sql)/i.test(prompt) ||
      prompt.length > 250
    ) {
      return ModelLoadBalancer.pickNextModel("strong") as GeminiModel;
    }

    // 3. Text formatting / Rewriting / Summarizing -> Gemma 4 31B or Light pool
    if (/(整理|排版|潤飾|改寫|統整成表格|摘要|總結|格式化)/i.test(prompt)) {
      return ModelLoadBalancer.pickNextModel("light") as GeminiModel;
    }

    // 4. General questions, translations, chatting -> Balanced pool (50% Strong : 50% Light round-robin)
    return ModelLoadBalancer.pickNextModel("balanced") as GeminiModel;
  }

  /**
   * Fallback structured intent router using Gemini Function Calling API with model chain load balancing.
   */
  async routeWithGemini(userPrompt: string): Promise<RoutingResult> {
    if (!this.apiKey) {
      const defaultModel = this.pickTargetModel(userPrompt);
      return {
        tool: "ask_llm",
        arguments: { prompt: userPrompt, target_model: defaultModel },
        confidence: 0.5,
        target_model: defaultModel
      };
    }

    const systemInstruction = `You are an expert intent router for a personal LINE Bot assistant.
Analyze the user's message and select the single most appropriate tool from the provided declarations.
If none of the specific tools match, use ask_llm.
Also select the target_model:
- Use strong models (gemini-3.7-flash, gemini-3.6-flash, gemini-3.5-flash) for complex analysis, coding, or high-difficulty reasoning.
- Use light models (gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemma-4-31b-it) for simple Q&A, translations, and everyday chatting.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      tools: [
        {
          functionDeclarations: ASSISTANT_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }))
        }
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "AUTO"
        }
      }
    };

    const chain = ModelLoadBalancer.getModelChain("light");

    for (const modelId of chain) {
      try {
        const url = `${GEMINI_API_BASE}/models/${modelId}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          console.warn(`[AiRouter] Gemini routing call on ${modelId} failed (${response.status})`);
          continue;
        }

        const data = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{
                functionCall?: {
                  name: string;
                  args: Record<string, unknown>;
                };
                text?: string;
              }>;
            };
          }>;
        };

        const firstPart = data.candidates?.[0]?.content?.parts?.[0];
        if (firstPart?.functionCall) {
          const toolName = firstPart.functionCall.name;
          const args = firstPart.functionCall.args || {};
          return {
            tool: toolName,
            arguments: args,
            confidence: 0.95,
            target_model: (args.target_model as GeminiModel) || this.pickTargetModel(userPrompt, toolName)
          };
        }

        // Default to ask_llm
        const selectedModel = this.pickTargetModel(userPrompt);
        return {
          tool: "ask_llm",
          arguments: { prompt: userPrompt, target_model: selectedModel },
          confidence: 0.9,
          target_model: selectedModel
        };
      } catch (err) {
        console.warn(`[AiRouter] Error on ${modelId}:`, err);
      }
    }

    const fallbackModel = this.pickTargetModel(userPrompt);
    return {
      tool: "ask_llm",
      arguments: { prompt: userPrompt, target_model: fallbackModel },
      confidence: 0.5,
      target_model: fallbackModel
    };
  }
}
