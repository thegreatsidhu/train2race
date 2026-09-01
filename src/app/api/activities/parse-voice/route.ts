// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropic, HAIKU_MODEL } from "@/lib/ai/client";

const SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["run", "ride", "swim", "strength", "walk", "other"] },
    durationMin: { type: ["number", "null"] },
    distance: { type: ["number", "null"] },
    unit: { type: ["string", "null"], enum: ["mi", "km", "m", "yd", null] },
    steps: { type: ["number", "null"] },
    notes: { type: ["string", "null"] },
  },
  required: ["type", "durationMin", "distance", "unit", "steps", "notes"],
  additionalProperties: false,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transcript } = await req.json().catch(() => ({}));
  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
  }

  const prompt = `Extract structured workout details from this spoken description: "${transcript}"

- type: one of run, ride, swim, strength, walk, other (best guess from context, default "run" if unclear)
- durationMin: total duration in minutes, converting any hours mentioned (null if not mentioned)
- distance: numeric distance (null if not mentioned)
- unit: the unit matching distance — mi or km for run/ride/walk, m or yd for swim (null if no distance)
- steps: step count, only relevant for walk/run (null if not mentioned)
- notes: any remaining descriptive detail such as how it felt or conditions, as a short sentence (null if none)`;

  try {
    const r = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });
    const text = r.content.find(b => b.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text);
    return NextResponse.json({ parsed });
  } catch {
    return NextResponse.json({ error: "Failed to parse voice input" }, { status: 500 });
  }
}
