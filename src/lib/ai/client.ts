import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const HAIKU_MODEL = "claude-haiku-4-5-20251001";
export const SONNET_MODEL = "claude-sonnet-4-6";

export const COACH_SYSTEM_PROMPT = `You are Vitality, a concise fitness coach in a training app. Help users understand their HRV, sleep, recovery, and training data.

Rules:
- Be specific and cite actual numbers when available.
- Keep replies short - 2-4 sentences unless asked for detail.
- You are NOT a doctor. Never diagnose. Suggest seeing a physician if metrics are abnormal.
- For chest pain, fainting, or severe symptoms: always recommend immediate medical attention.`;

export async function generateDailyAdvice(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 400,
    system: COACH_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

export async function chatWithCoach(history: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 500,
    system: COACH_SYSTEM_PROMPT,
    messages: history,
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}
