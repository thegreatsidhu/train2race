import Anthropic from "@anthropic-ai/sdk";export const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});export const HAIKU_MODEL = "claude-haiku-4-5";export const SONNET_MODEL = "claude-sonnet-5";export const COACH_SYSTEM_PROMPT = "You are the Train2Race coach, a concise fitness coach. Be specific, cite numbers, keep replies short. Not a doctor.";

import { parseModelJson } from "./json";

/**
 * Calls the model expecting a JSON response, retrying the whole generate+parse cycle (not just
 * repairing text after the fact) on either an empty response (the model got stuck and burned its
 * token budget without producing real content) or malformed JSON (e.g. an unescaped quote
 * breaking a string boundary in a way parseModelJson's repair heuristics can't recover) — a
 * regenerated response essentially never has the exact same malformation twice.
 */
export async function generateJsonWithRetry(opts: { model: string; maxTokens: number; prompt: string; maxAttempts?: number }): Promise<any> {
  const { model, maxTokens, prompt, maxAttempts = 3 } = opts;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const msg = await anthropic.messages.create({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    if (!text.trim()) { lastError = new Error(`Model returned no text content (stop_reason: ${msg.stop_reason})`); continue; }
    const cleaned = text.replace(/```json|```/g, "").trim();
    try { return parseModelJson(cleaned); } catch (e) { lastError = e; }
  }
  throw lastError instanceof Error ? lastError : new Error("Model response could not be parsed after retries");
}
