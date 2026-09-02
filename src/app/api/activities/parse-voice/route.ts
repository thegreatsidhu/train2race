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
    // A nullable enum must use anyOf — combining `type: ["string","null"]` with `enum`
    // (including a literal null in the enum) is rejected outright by the API with
    // "Enum value 'mi' does not match declared type", which made every single voice
    // parse fail with a 400 regardless of transcript content.
    unit: { anyOf: [{ type: "string", enum: ["mi", "km", "m", "yd"] }, { type: "null" }] },
    steps: { type: ["number", "null"] },
    notes: { type: ["string", "null"] },
  },
  // Only "type" is required. Everything else must be independently optional — voice input
  // frequently states just one of duration/distance/steps, and previously marking every
  // field "required" (even though nullable) made the model fail extraction entirely
  // whenever one was missing, e.g. "10 mile run" (no duration mentioned).
  required: ["type"],
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

Only "type" is required. Every other field is genuinely optional — most voice input only
mentions one or two of duration, distance, or steps. Set a field to null whenever it isn't
stated; never guess or derive one field from another (e.g. do not estimate durationMin from
distance, or distance from durationMin).

- type: one of run, ride, swim, strength, walk, other. Infer from context ("swim" → swim,
  "strength session" / "lifted weights" → strength, "walked" → walk). Use "other" only if
  truly nothing in the transcript indicates an activity.
- durationMin: total duration in minutes if a time is stated, converting hours to minutes
  (e.g. "30 minutes" → 30, "an hour" → 60, "an hour and a half" → 90). null if no duration
  is mentioned at all.
- distance: numeric distance if stated (e.g. "10 mile run" → 10, "5k" → 5). null if not
  mentioned.
- unit: the unit matching distance — mi or km for run/ride/walk, m or yd for swim, km for
  "5k"/"10k"-style distances. null if distance is null.
- steps: step count, only if a step count is explicitly stated. null otherwise.
- notes: any remaining descriptive detail — how it felt, conditions, location — as a short
  phrase. null if there's nothing left to note.

Examples:
"10 mile run" → {"type":"run","durationMin":null,"distance":10,"unit":"mi","steps":null,"notes":null}
"30 minute swim" → {"type":"swim","durationMin":30,"distance":null,"unit":null,"steps":null,"notes":null}
"walked for an hour" → {"type":"walk","durationMin":60,"distance":null,"unit":null,"steps":null,"notes":null}
"morning run 5k in 25 minutes" → {"type":"run","durationMin":25,"distance":5,"unit":"km","steps":null,"notes":null}
"quick strength session" → {"type":"strength","durationMin":null,"distance":null,"unit":null,"steps":null,"notes":null}`;

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
  } catch (err) {
    console.error("[parse-voice] Claude call failed. transcript:", transcript, "error:", err);
    return NextResponse.json({ error: "Failed to parse voice input" }, { status: 500 });
  }
}
