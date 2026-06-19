// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const race = await prisma.raceTarget.findUnique({ where: { id: params.id, userId } });
  if (!race) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { weeklyMileageKm, recentRaceTime, trainingDaysPerWeek, raceType, isTriathlon } = body;

  const weeksToRace = Math.max(4, Math.round((race.raceDate.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)));
  const distanceKm = race.distanceM / 1000;
  const goalTime = race.goalTimeSec
    ? `${Math.floor(race.goalTimeSec / 3600)}h ${Math.floor((race.goalTimeSec % 3600) / 60)}m`
    : "finish";

  const prompt = `You are an expert endurance coach. Create a detailed ${weeksToRace}-week training plan.

Race: ${race.raceName}
Distance: ${distanceKm}km ${isTriathlon ? "(triathlon)" : "(running)"}
Goal time: ${goalTime}
Race type: ${raceType} race
Current weekly mileage: ${weeklyMileageKm || "unknown"}km
Recent race time: ${recentRaceTime || "none provided"}
Training days per week: ${trainingDaysPerWeek || 5}
Weeks until race: ${weeksToRace}

Generate a training plan as a JSON array of workouts. Each workout must have:
- week (number 1-${weeksToRace})
- day (Monday/Tuesday/Wednesday/Thursday/Friday/Saturday/Sunday)
- type (easy_run/tempo/intervals/long_run/rest/cross_train/race${isTriathlon ? "/swim/bike/brick" : ""})
- title (short name)
- description (2-3 sentences of coaching instruction)
- distanceKm (number or null)
- durationMin (number or null)

Return ONLY a valid JSON array, no other text.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const workouts = JSON.parse(text.replace(/```json|```/g, "").trim());

  // Delete existing plan if any
  await prisma.trainingPlan.deleteMany({ where: { raceId: race.id } });

  // Calculate dates for each workout
  const raceDate = new Date(race.raceDate);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Start from next Monday

  const dayMap: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
    Friday: 4, Saturday: 5, Sunday: 6,
  };

  const plan = await prisma.trainingPlan.create({
    data: {
      userId,
      raceId: race.id,
      workouts: {
        create: workouts.map((w: any) => {
          const workoutDate = new Date(startDate);
          workoutDate.setDate(startDate.getDate() + (w.week - 1) * 7 + (dayMap[w.day] || 0));
          return {
            week: w.week,
            day: w.day,
            date: workoutDate,
            type: w.type,
            title: w.title,
            description: w.description,
            distanceKm: w.distanceKm || null,
            durationMin: w.durationMin || null,
          };
        }),
      },
    },
  });

  return NextResponse.json({ plan });
}
