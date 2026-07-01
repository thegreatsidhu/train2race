// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MODEL, SONNET_MODEL } from "@/lib/ai/client";

const anthropic = new Anthropic();

const RACE_GUIDELINES = {
  "5K":                { model: HAIKU_MODEL, maxTokens: 800,  maxWeeks: 6,  minWeeks: 4,  maxMi: 5,  wMi: "15-25", pMi: "20-25", workouts: "400m intervals, tempo 2-3mi, easy 2-4mi" },
  "10K":               { model: HAIKU_MODEL, maxTokens: 1000, maxWeeks: 8,  minWeeks: 6,  maxMi: 7,  wMi: "20-35", pMi: "25-35", workouts: "tempo 3-4mi, 1K intervals, easy 3-5mi" },
  "Half Marathon":     { model: HAIKU_MODEL, maxTokens: 1500, maxWeeks: 12, minWeeks: 8,  maxMi: 13, wMi: "25-45", pMi: "35-45", workouts: "long 8-12mi, tempo 4-6mi, easy 4-7mi" },
  "Marathon":          { model: HAIKU_MODEL, maxTokens: 2500, maxWeeks: 16, minWeeks: 16, maxMi: 22, wMi: "35-55", pMi: "45-55", workouts: "long 14-22mi, marathon pace, easy 5-10mi" },
  "Ultra":             { model: HAIKU_MODEL, maxTokens: 3000, maxWeeks: 18, minWeeks: 20, maxMi: 30, wMi: "40-70", pMi: "55-70", workouts: "back-to-back longs, trail runs" },
  "Sprint Triathlon":  { model: HAIKU_MODEL, maxTokens: 2000, maxWeeks: 8,  minWeeks: 6,  maxMi: 4,  wMi: "8-12 swim/bike/run combined", pMi: "multi", workouts: "swim 0.3-0.5mi, bike 8-15mi, run 2-4mi, brick" },
  "Olympic Triathlon": { model: HAIKU_MODEL, maxTokens: 2500, maxWeeks: 12, minWeeks: 10, maxMi: 8,  wMi: "10-16 combined", pMi: "multi", workouts: "swim 0.6-1mi, bike 15-28mi, run 4-7mi, brick" },
  "70.3 Triathlon":    { model: HAIKU_MODEL, maxTokens: 3500, maxWeeks: 16, minWeeks: 16, maxMi: 13, wMi: "14-20 combined", pMi: "multi", workouts: "swim 0.8-1.5mi, bike 30-56mi, run 6-13mi, brick" },
  "140.6 Triathlon":   { model: HAIKU_MODEL, maxTokens: 4000, maxWeeks: 20, minWeeks: 20, maxMi: 26, wMi: "20-30 combined", pMi: "multi", workouts: "swim 1.5-2.5mi, bike 60-112mi, run 10-26mi, brick" },
};

function getTriathlonDistances(category: string) {
  switch (category) {
    case "Sprint Triathlon":  return { swimMi: 0.47, bikeMi: 12.4, runMi: 3.1 };
    case "Olympic Triathlon": return { swimMi: 0.93, bikeMi: 24.9, runMi: 6.2 };
    case "70.3 Triathlon":   return { swimMi: 1.2,  bikeMi: 56,   runMi: 13.1 };
    case "140.6 Triathlon":  return { swimMi: 2.4,  bikeMi: 112,  runMi: 26.2 };
    default:                  return { swimMi: 1.2,  bikeMi: 56,   runMi: 13.1 };
  }
}

// Returns per-week target distances (in miles) for a single discipline.
// Follows: linear build → peak (week N-2) → taper (week N-1) → race week.
// Cutback week every 4 weeks drops volume by 20%.
function buildDisciplineTargets(weeksToRace: number, peakMi: number, startFraction = 0.2): Record<number, number> {
  const startMi = Math.max(2, Math.round(peakMi * startFraction * 10) / 10);
  const peakWeek = Math.max(1, weeksToRace - 2);
  const taperWeek = weeksToRace - 1;
  const targets: Record<number, number> = {};
  for (let w = 1; w <= weeksToRace; w++) {
    if (w === weeksToRace) {
      targets[w] = Math.max(2, Math.round(peakMi * 0.1 * 10) / 10); // short race-week opener
    } else if (w === taperWeek) {
      targets[w] = Math.round(peakMi * 0.55 * 10) / 10;
    } else if (w >= peakWeek) {
      targets[w] = peakMi;
    } else {
      const span = Math.max(1, peakWeek - 1);
      let mi = startMi + (peakMi - startMi) * ((w - 1) / span);
      if (w % 4 === 0) mi *= 0.8; // cutback week
      targets[w] = Math.max(startMi, Math.round(mi * 10) / 10);
    }
  }
  return targets;
}

function getCategory(distanceM: number, isTriathlon: boolean): string {
  if (isTriathlon) {
    if (distanceM <= 30000) return "Sprint Triathlon";
    if (distanceM <= 60000) return "Olympic Triathlon";
    if (distanceM <= 120000) return "70.3 Triathlon";
    return "140.6 Triathlon";
  }
  if (distanceM <= 5500) return "5K";
  if (distanceM <= 11000) return "10K";
  if (distanceM <= 22000) return "Half Marathon";
  if (distanceM <= 43000) return "Marathon";
  return "Ultra";
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const race = await prisma.raceTarget.findUnique({ where: { id, userId } });
  if (!race) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const {
    weeklyMileageKm, weeklyHours, trackingMethod, athleteLevel,
    recentRaceTime, trainingDaysPerWeek,
    raceType, hardDays, longRunDay, injuryConcerns, fitnessNotes, prioritize,
  } = body;

  const isTimeBased = trackingMethod === "time" && !race.isTriathlon;

  // Always use isTriathlon from the DB — don't trust the request body
  const isTriathlon = race.isTriathlon || false;
  const category = getCategory(race.distanceM, isTriathlon);
  const g = RACE_GUIDELINES[category];
  const days = Number(trainingDaysPerWeek) || 5;

  const actualWeeksToRace = Math.round((new Date(race.raceDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000));

  if (actualWeeksToRace < g.minWeeks) {
    return NextResponse.json({
      error: `Not enough time. A ${category} needs at least ${g.minWeeks} weeks of training. Your race is only ${actualWeeksToRace} week${actualWeeksToRace === 1 ? "" : "s"} away.`
    }, { status: 400 });
  }

  const weeksToRace = Math.min(Math.max(4, actualWeeksToRace), g.maxWeeks);
  const distanceMiles = (race.distanceM / 1609.34).toFixed(1);
  const goalTime = race.goalTimeSec
    ? `${Math.floor(race.goalTimeSec / 3600)}h ${Math.floor((race.goalTimeSec % 3600) / 60)}m`
    : "finish";
  const curMi = weeklyMileageKm
    ? (weeklyMileageKm / 1.60934).toFixed(0)
    : category === "5K" ? "15" : category === "10K" ? "20" : category === "Half Marathon" ? "25" : "30";

  const curVolume = isTimeBased
    ? (weeklyHours ? `${weeklyHours} hours/week` : "3-4 hours/week")
    : `${curMi} miles/week`;

  const TIME_VOLUME: Record<string, string> = {
    "5K": "120-210", "10K": "150-270", "Half Marathon": "210-390",
    "Marathon": "300-540", "Ultra": "420-750",
  };
  const timeVolumeMin = TIME_VOLUME[category] || "210-390";

  const levelInstructions = athleteLevel === "beginner"
    ? `\nBEGINNER RULES: Weeks 1-3 easy_run and long_run ONLY — zero tempo, zero intervals. Introduce tempo after week 4, intervals after week 8 (if plan is long enough). Start week 1 at 60% of stated volume. Cutback every 3rd week. Descriptions should be encouraging and simple.`
    : athleteLevel === "advanced"
    ? `\nADVANCED RULES: Include tempo from week 1, intervals from week 2. Up to 3 quality sessions/week at peak. Standard 10% weekly build, occasional 15% in build phase.`
    : "";

  const TIME_LONG_MAX: Record<string, number> = {
    "5K": 45, "10K": 65, "Half Marathon": 95, "Marathon": 155, "Ultra": 185,
  };
  const timeLongMax = TIME_LONG_MAX[category] || 95;

  const TIME_WORKOUTS_GUIDE: Record<string, string> = {
    "5K": "easy 20-35min, tempo 15-25min, intervals 25-35min, long 30-45min",
    "10K": "easy 25-40min, tempo 20-35min, intervals 30-45min, long 45-65min",
    "Half Marathon": "easy 30-50min, tempo 25-45min, intervals 35-50min, long 60-95min",
    "Marathon": "easy 40-60min, tempo 30-50min, intervals 40-55min, long 90-155min",
    "Ultra": "easy 45-70min, tempo 35-55min, intervals 45-65min, long 120-185min",
  };
  const timeWorkoutsGuide = TIME_WORKOUTS_GUIDE[category] || "easy 30-50min, tempo 25-40min, intervals 35-50min, long 60-90min";

  const rulesBlock = isTimeBased
    ? `RULES:
- Long run MAX: ${timeLongMax} minutes — NEVER exceed
- Weekly volume: ${timeVolumeMin} minutes/week total
- Key workout durations: ${timeWorkoutsGuide}
- Week 1: conservative, at or below current training time
- Build max 10% per week (by minutes)
- Cutback week every 3-4 weeks (reduce 20%)
- Final 1-2 weeks: taper (reduce durations)
- CRITICAL: every training workout MUST have distanceMiles:null and durationMin set to an integer
- Describe workouts in time: "35 minutes easy" NOT "5 miles easy"
- Last day of week ${weeksToRace}: type:"race", distanceMiles:${distanceMiles}, durationMin:<estimated finish in minutes>, description:"Race day! Give it everything."
- Generate ONLY ${days} workout days per week, NO rest days in JSON`
    : `RULES:
- Long run/ride MAX: ${g.maxMi} miles — NEVER exceed
- Weekly volume: ${g.wMi}
- Peak week: ${g.pMi}
- Key workouts: ${g.workouts}
- Week 1: conservative, at or below current volume
- Build max 10% per week
- Cutback week every 3-4 weeks (reduce 20%)
- Final 1-2 weeks: taper
- Last day of week ${weeksToRace}: include exactly ONE workout with type:"race", title:"Race Day", distanceMiles:${distanceMiles}, description:"Race day! Run your goal time."
- Generate ONLY ${days} workout days per week, NO rest days in JSON`;

  const exampleWorkout = isTimeBased
    ? `[{"week":1,"day":"Tuesday","type":"easy_run","title":"Easy Run","description":"35 minutes easy conversational pace","distanceMiles":null,"durationMin":35}]`
    : `[{"week":1,"day":"Tuesday","type":"easy_run","title":"Easy Run","description":"Easy conversational pace, focus on form","distanceMiles":3,"durationMin":null}]`;

  const notes = [
    hardDays?.length > 0 ? `Hard days: ${hardDays.join(", ")}` : "",
    longRunDay ? `Long run day: ${longRunDay}` : "Long run day: Saturday",
    injuryConcerns ? `INJURY ALERT - "${injuryConcerns}": reduce volume 10-15%, avoid aggravating workouts, substitute with cross-training or rest, never back-to-back hard days` : "",
    fitnessNotes ? `Fitness context: ${fitnessNotes}` : "",
    prioritize ? `Focus: ${prioritize}` : "",
  ].filter(Boolean).join(". ");

  const triDist = isTriathlon ? getTriathlonDistances(category) : null;

  // Pre-compute per-week targets so both the prompt and post-processing use the same numbers
  const bikeTargets = triDist ? buildDisciplineTargets(weeksToRace, Math.round(triDist.bikeMi * 0.9), 0.2) : {};
  const swimTargets = triDist ? buildDisciplineTargets(weeksToRace, parseFloat((triDist.swimMi * 1.05).toFixed(2)), 0.3) : {};

  // Sample anchor weeks for the prompt (every 4th week + peak + taper + race)
  const bikeAnchors = triDist
    ? Array.from({ length: weeksToRace }, (_, i) => i + 1)
        .filter(w => w === 1 || w % 4 === 0 || w >= weeksToRace - 2)
        .map(w => `wk${w}:${bikeTargets[w]}mi`)
        .join(", ")
    : "";
  const swimAnchors = triDist
    ? Array.from({ length: weeksToRace }, (_, i) => i + 1)
        .filter(w => w === 1 || w % 4 === 0 || w >= weeksToRace - 2)
        .map(w => `wk${w}:${swimTargets[w]}mi`)
        .join(", ")
    : "";

  const triathlonInstructions = isTriathlon && triDist ? `
TRIATHLON RACE DISTANCES:
- Swim: ${triDist.swimMi} mi  |  Bike: ${triDist.bikeMi} mi  |  Run: ${triDist.runMi} mi

TRIATHLON BUILD-UP RULES (CRITICAL):
- Bike distances MUST increase each week and then taper — use these exact targets per week: ${bikeAnchors}
- Swim distances MUST increase each week and then taper — use these exact targets per week: ${swimAnchors}
- Run: start ~${(triDist.runMi * 0.3).toFixed(1)} mi, build each week to ${triDist.runMi} mi at peak, taper final 2 weeks
- Every week MUST include at least 1 swim, 1 bike, and 1 run session
- Include 1 brick (bike-then-run) every 2 weeks — title: "Brick: Xmi bike + Ymi run" where X follows the bike targets above
- Types allowed: swim, bike, easy_run, intervals, long_run, brick
- Final race day workout: type "race" with the full total distance in distanceMiles
- NO running-only plans — all three disciplines every week, always` : "";

  const prompt = `Expert endurance coach. Create a ${weeksToRace}-week ${category} training plan.

Race: ${race.raceName}, ${distanceMiles} miles, goal ${goalTime}
Athlete: ${curVolume} current, ${days} days/week training, level: ${athleteLevel || "intermediate"}
${notes}${levelInstructions}

${rulesBlock}
${triathlonInstructions}

Return ONLY a JSON array. Keep descriptions under 15 words:
${exampleWorkout}

Valid types: easy_run, tempo, intervals, long_run, cross_train, race${isTriathlon ? ", swim, bike, brick" : ""}
No markdown. No explanation. Just the array.`;

  try {
    const msg = await anthropic.messages.create({
      model: g.model,
      max_tokens: g.maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const workouts = JSON.parse(text.replace(/```json|```/g, "").trim());

    const TIME_DEFAULT_DURATION: Record<string, number> = {
      easy_run: 40, long_run: 70, tempo: 35, intervals: 40, cross_train: 45,
    };

    const validated = workouts
      .filter((w: any) => w.type !== "rest")
      .map((w: any) => {
        let d = w.distanceMiles;
        if (w.type === "race") {
          d = parseFloat(distanceMiles);
        } else if (isTimeBased) {
          d = null; // strip any distance the AI may have included for time-based plans
        } else if (triDist) {
          if (w.type === "bike") {
            // Always use the deterministic progressive target — ignore AI value
            d = bikeTargets[w.week] ?? Math.min(d ?? triDist.bikeMi * 0.5, triDist.bikeMi * 1.05);
          } else if (w.type === "swim") {
            // Same for swim
            d = swimTargets[w.week] ?? Math.min(d ?? triDist.swimMi * 0.5, triDist.swimMi * 1.3);
          } else if (w.type === "brick") {
            d = d; // brick has combined distance — AI handles these, leave as-is
          } else {
            d = Math.min(d ?? g.maxMi, g.maxMi); // run types
          }
        } else {
          d = d > g.maxMi ? g.maxMi : d;
        }
        const dur = (isTimeBased && w.type !== "race" && !w.durationMin)
          ? (TIME_DEFAULT_DURATION[w.type] || 40)
          : (w.durationMin || null);
        return { ...w, distanceMiles: d, durationMin: dur };
      });

    await prisma.trainingPlan.deleteMany({ where: { raceId: race.id } });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1);
    const dayMap: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

    await prisma.trainingPlan.create({
      data: {
        userId,
        raceId: race.id,
        workouts: {
          create: validated.map((w: any) => {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + (w.week - 1) * 7 + (dayMap[w.day] || 0));
            return {
              week: w.week,
              day: w.day,
              date: d,
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

    // Auto-register for the matching community race so the user appears in its leaderboard
    try {
      const raceDate = new Date(race.raceDate);
      const window = 8 * 24 * 60 * 60 * 1000; // ±8 days
      const matchingRace = await prisma.majorRace.findFirst({
        where: {
          name: { contains: race.raceName, mode: "insensitive" },
          raceDate: { gte: new Date(raceDate.getTime() - window), lte: new Date(raceDate.getTime() + window) },
        },
        select: { id: true },
      });
      if (matchingRace) {
        await prisma.raceRegistration.upsert({
          where: { userId_majorRaceId: { userId, majorRaceId: matchingRace.id } },
          update: { raceTargetId: race.id },
          create: { userId, majorRaceId: matchingRace.id, raceTargetId: race.id, isPublic: true, goalTimeSec: race.goalTimeSec ?? null },
        });
      }
    } catch (_) { /* non-fatal — plan still created */ }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
