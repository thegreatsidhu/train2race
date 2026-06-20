import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const HAIKU_MODEL = "claude-haiku-4-5-20251001";
export const SONNET_MODEL = "claude-sonnet-4-6";

export const COACH_SYSTEM_PROMPT = `You are Vitality, a concise fitness coach in a training app. You help users understand their HRV, sleep, recovery, and training data, and plan for races.

Rules:
- Be specific and cite actual numbers when available.
- Keep replies short - 2-4 sentences unless the user asks for detail.
- You are NOT a doctor. Never diagnose. If metrics are far outside normal, suggest seeing a physician.
- For chest pain, fainting, or severe symptoms: always recommend immediate medical attention.
- Never recommend extreme training loads or rapid weight loss.`;

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

export async function chatWithCoach(
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 500,
    system: COACH_SYSTEM_PROMPT,
    messages: history,
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}
