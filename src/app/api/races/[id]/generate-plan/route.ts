// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const race = await prisma.raceTarget.findUnique({ where: { id, userId } });
  if (!race) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { weeklyMileageKm, recentRaceTime, trainingDaysPerWeek, raceType, isTriathlon } = body;

  const weeksToRace = Math.max(4, Math.round((race.raceDate.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)));
  const distanceMiles = (race.distanceM / 1609.34).toFixed(1);
  const goalTime = race.goalTimeSec
    ? `${Math.floor(race.goalTimeSec / 3600)}h ${Math.floor((race.goalTimeSec % 3600) / 60)}m`
    : "finish";

  const prompt = `You are an expert endurance coach. Create a detailed ${weeksToRace}-week training plan.
Race: ${race.raceName}
Distance: ${distanceMiles} miles ${isTriathlon ? "(triathlon)" : "(running)"}
Goal time: ${goalTime}
Race type: ${raceType || "main"} race
Current weekly mileage: ${weeklyMileageKm || 30} miles
Recent race time: ${recentRaceTime || "none provided"}
Training days per week: ${trainingDaysPerWeek || 5}
Weeks until race: ${weeksToRace}

Generate a training plan as a JSON array of workouts. Each workout must have:
- week (number 1-${weeksToRace})
- day (Monday/Tuesday/Wednesday/Thursday/Friday/Saturday/Sunday)
- type (easy_run/tempo/intervals/long_run/rest/cross_train/race${isTriathlon ? "/swim/bike/brick" : ""})
- title (short name)
- description (2-3 sentences of coaching instruction)
- distanceMiles (number or null)
- durationMin (number or null)

Return ONLY a valid JSON array with no markdown, no code blocks, no explanation.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const workouts = JSON.parse(cleaned);

    await prisma.trainingPlan.deleteMany({ where: { raceId: race.id } });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1);

    const dayMap = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

    const plan = await prisma.trainingPlan.create({
      data: {
        userId,
        raceId: race.id,
        workouts: {
          create: workouts.map((w) => {
            const workoutDate = new Date(startDate);
            workoutDate.setDate(startDate.getDate() + (w.week - 1) * 7 + (dayMap[w.day] || 0));
            return {
              week: w.week,
              day: w.day,
              date: workoutDate,
              type: w.type,
              title: w.title,
              description: w.description,
              distanceKm: w.distanceMiles ? w.distanceMiles * 1.60934 : null,
              durationMin: w.durationMin || null,
            };
          }),
        },
      },
    });

    return NextResponse.json({ plan });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
