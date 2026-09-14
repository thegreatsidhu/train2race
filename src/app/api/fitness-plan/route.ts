// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { computeCalorieTarget } from "@/lib/health/weightLoss";

const anthropic = new Anthropic();

// Best-effort repair for a JSON response truncated by hitting max_tokens — closes any
// unterminated string and any open brackets/braces so JSON.parse has a chance to succeed.
function repairJsonTail(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of text) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let repaired = text;
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\s*$/, "");
  while (stack.length) repaired += stack.pop() === "{" ? "}" : "]";
  return repaired;
}

function parseModelJson(cleaned: string): any {
  try { return JSON.parse(cleaned); } catch { return JSON.parse(repairJsonTail(cleaned)); }
}

const DAY_MAP: Record<number, string> = {
  2: "Tuesday, Thursday",
  3: "Monday, Wednesday, Friday",
  4: "Monday, Tuesday, Thursday, Friday",
  5: "Monday, Tuesday, Wednesday, Thursday, Friday",
};

async function buildPlan(goal: string, location: string, currentFitness: string, daysPerWeek: number): Promise<any> {
  const prompt = `You are a certified personal trainer. Generate a 4-week workout plan.

User profile:
- Goal: ${goal}
- Workout location: ${location}
- Current activity level: ${currentFitness}
- Days per week: ${daysPerWeek} (${DAY_MAP[daysPerWeek] || "spread evenly"})

Return ONLY valid JSON (no markdown fences, no extra text) matching this structure:
{
  "planTitle": "Short descriptive title",
  "weeks": [
    {
      "week": 1,
      "theme": "One sentence focus for this week",
      "workouts": [
        {
          "id": "w1_d1",
          "day": "Monday",
          "title": "Workout name",
          "type": "strength",
          "durationMin": 30,
          "exercises": [
            { "name": "Exercise", "sets": 3, "reps": "10", "instructions": "Form cue" }
          ]
        }
      ]
    }
  ]
}

Rules:
- Exactly ${daysPerWeek} workouts per week on: ${DAY_MAP[daysPerWeek] || "spread evenly"}
- type must be one of: strength, cardio, hiit, stretch
- Weeks 1-2 lighter, weeks 3-4 progressively harder
- At home (no equipment): bodyweight only
- At home (with equipment): dumbbells, resistance bands
- At a gym: free weights and machines
- Outdoors: running, bodyweight, park exercises
- 4-7 exercises per session
- 20-45 min per workout depending on fitness level
- Unique IDs: w1_d1, w1_d2, w2_d1, etc. across all weeks`;

  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return parseModelJson(cleaned);
}

async function buildNutrition(goal: string, currentFitness: string, daysPerWeek: number, fixedCalorieTarget?: number): Promise<any> {
  const prompt = `You are a registered dietitian providing general wellness guidance. Generate simple nutrition tips.

User profile:
- Goal: ${goal}
- Current activity level: ${currentFitness}
- Workout days per week: ${daysPerWeek}
${fixedCalorieTarget ? `\nThis user's daily calorie target has already been calculated from their BMR/TDEE at ${fixedCalorieTarget} kcal/day for a safe ~1 lb/week loss pace. Build your tips and food guidance around that exact number — do not suggest a different calorie target.\n` : ""}
Return ONLY valid JSON (no markdown, no extra text):
{
  "dailyCalorieRange": "1800-2200",
  "proteinTargetG": "120-150",
  "tips": [
    "Practical tip 1",
    "Practical tip 2",
    "Practical tip 3",
    "Practical tip 4",
    "Practical tip 5"
  ],
  "focusFoods": ["food1", "food2", "food3", "food4", "food5", "food6"],
  "limitFoods": ["food1", "food2", "food3", "food4", "food5"]
}

Keep tips actionable, simple, and tailored to the user's specific goal.`;

  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return parseModelJson(cleaned);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const plan = await prisma.fitnessPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ plan });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { goal, location, currentFitness, daysPerWeek, includeNutrition, weightKg: bodyWeightKg, heightCm: bodyHeightCm } = await req.json();
  if (!goal || !location || !currentFitness || !daysPerWeek) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const isWeightLoss = goal === "Lose weight";
  let weightLossFields: {
    startWeightKg: number; startHeightCm: number; bmr: number; tdee: number;
    dailyCalorieTarget: number; weeklyLossTargetLbs: number;
  } | null = null;

  if (isWeightLoss) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { weightKg: true, heightCm: true, sex: true, dateOfBirth: true } });

    let weightKg = bodyWeightKg != null ? Number(bodyWeightKg) : user?.weightKg;
    let heightCm = bodyHeightCm != null ? Number(bodyHeightCm) : user?.heightCm;

    if (weightKg == null || heightCm == null || isNaN(weightKg) || isNaN(heightCm)) {
      return NextResponse.json({ error: "Height and weight are required to build a weight-loss plan." }, { status: 400 });
    }
    if (weightKg < 10 || weightKg > 500) return NextResponse.json({ error: "Weight must be between 10 and 500 kg" }, { status: 400 });
    if (heightCm < 50 || heightCm > 300) return NextResponse.json({ error: "Height must be between 50 and 300 cm" }, { status: 400 });

    // Keep the profile in sync if the user just entered fresh numbers in the questionnaire gate.
    const profileUpdate: any = {};
    if (bodyWeightKg != null) profileUpdate.weightKg = weightKg;
    if (bodyHeightCm != null) profileUpdate.heightCm = heightCm;
    if (Object.keys(profileUpdate).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: profileUpdate });
    }

    const { bmr, tdee, dailyCalorieTarget, weeklyLossTargetLbs } = computeCalorieTarget({
      weightKg, heightCm, dateOfBirth: user?.dateOfBirth, sex: user?.sex, currentFitness,
    });

    weightLossFields = { startWeightKg: weightKg, startHeightCm: heightCm, bmr, tdee, dailyCalorieTarget, weeklyLossTargetLbs };
  }

  try {
    const tasks: [Promise<any>, Promise<any> | null] = [
      buildPlan(goal, location, currentFitness, Number(daysPerWeek)),
      includeNutrition ? buildNutrition(goal, currentFitness, Number(daysPerWeek), weightLossFields?.dailyCalorieTarget) : null,
    ];

    const [planContent, nutritionContent] = await Promise.all(tasks);

    const plan = await prisma.fitnessPlan.create({
      data: {
        userId,
        goal,
        location,
        currentFitness,
        daysPerWeek: Number(daysPerWeek),
        planContent,
        nutritionContent: nutritionContent ?? undefined,
        ...(weightLossFields ?? {}),
      },
    });

    return NextResponse.json({ plan });
  } catch (err) {
    console.error("fitness-plan generate error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to generate plan: ${detail}` }, { status: 500 });
  }
}
