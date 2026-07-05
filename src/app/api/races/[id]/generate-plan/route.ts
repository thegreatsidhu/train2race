// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MODEL, SONNET_MODEL } from "@/lib/ai/client";
const anthropic = new Anthropic();
const RACE_GUIDELINES = {
  "5K":                { model: HAIKU_MODEL,  maxTokens: 2500, maxWeeks: 6,  minWeeks: 4,  maxMi: 5,  wMi: "15-25", pMi: "20-25", workouts: "400m intervals, tempo 2-3mi, easy 2-4mi" },
  "10K":               { model: HAIKU_MODEL,  maxTokens: 1800, maxWeeks: 8,  minWeeks: 6,  maxMi: 7,  wMi: "20-35", pMi: "25-35", workouts: "tempo 3-4mi, 1K intervals, easy 3-5mi" },
  "Half Marathon":     { model: HAIKU_MODEL,  maxTokens: 2500, maxWeeks: 12, minWeeks: 8,  maxMi: 13, wMi: "25-45", pMi: "35-45", workouts: "long 8-12mi, tempo 4-6mi, easy 4-7mi" },
  "Marathon":          { model: SONNET_MODEL, maxTokens: 4000, maxWeeks: 16, minWeeks: 16, maxMi: 22, wMi: "35-55", pMi: "45-55", workouts: "long 14-22mi, marathon pace, easy 5-10mi" },
  "Ultra":             { model: SONNET_MODEL, maxTokens: 4500, maxWeeks: 18, minWeeks: 20, maxMi: 30, wMi: "40-70", pMi: "55-70", workouts: "back-to-back longs, trail runs" },
  "Sprint Triathlon":  { model: HAIKU_MODEL,  maxTokens: 2500, maxWeeks: 8,  minWeeks: 6,  maxMi: 6,  wMi: "combined 8-12", pMi: "multi", workouts: "swim 400-800m, bike 10-15mi, run 2-4mi, brick" },
  "Olympic Triathlon": { model: HAIKU_MODEL,  maxTokens: 2000, maxWeeks: 12, minWeeks: 10, maxMi: 10, wMi: "combined 10-16", pMi: "multi", workouts: "swim 1000-1500m, bike 20-28mi, run 4-7mi, brick" },
  "70.3 Triathlon":    { model: SONNET_MODEL, maxTokens: 3000, maxWeeks: 16, minWeeks: 16, maxMi: 13, wMi: "combined 14-20", pMi: "multi", workouts: "swim 1-2mi, bike 30-56mi, run 6-13mi, brick" },
  "140.6 Triathlon":   { model: SONNET_MODEL, maxTokens: 3500, maxWeeks: 20, minWeeks: 20, maxMi: 26, wMi: "combined 20-30", pMi: "multi", workouts: "swim 2-4mi, bike 60-112mi, run 10-26mi, brick" },
};
function getCategory(distanceM, isTriathlon) {
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
export async function POST(req, { params }) {
  const { id } = await params;
  const session = await auth();
  const userId = session.user.id;
  const race = await prisma.raceTarget.findUnique({ where: { id, userId } });
  if (!race) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { planGenerationCount: true } });
  if ((userRecord?.planGenerationCount ?? 0) >= 3) return NextResponse.json({ error: "You've used your 3 plan generations. Consistency beats perfection — stick with your current plan for 8 weeks. Need help? Contact support@train2race.com" }, { status: 429 });
  const recentPlan = await prisma.trainingPlan.findFirst({ where: { raceId: race.id, createdAt: { gte: new Date(Date.now()-5*60*1000) } }, select: { id: true } });
  if (recentPlan) return NextResponse.json({ error: "Please wait 5 minutes before regenerating" }, { status: 429 });
  const body = await req.json();
  const { weeklyMileageKm, weeklyHours, trackingMethod, athleteLevel, recentRaceTime, trainingDaysPerWeek, hardDays, longRunDay, injuryConcerns, fitnessNotes, prioritize } = body;
  const isTriathlon = race.isTriathlon || false;
  const isTimeBased = trackingMethod === "time" && !isTriathlon;
  const category = getCategory(race.distanceM, isTriathlon);
  const g = RACE_GUIDELINES[category];
  const days = Number(trainingDaysPerWeek) || 5;
  const actualWeeks = Math.round((new Date(race.raceDate).getTime() - Date.now()) / (7*24*60*60*1000));
  if (actualWeeks < g.minWeeks) return NextResponse.json({ error: `Need at least ${g.minWeeks} weeks for a ${category}. Your race is ${actualWeeks} weeks away.` }, { status: 400 });
  const weeks = Math.min(Math.max(4, actualWeeks), g.maxWeeks);
  const distanceMiles = (race.distanceM / 1609.34).toFixed(1);
  const goalTime = race.goalTimeSec ? `${Math.floor(race.goalTimeSec/3600)}h ${Math.floor((race.goalTimeSec%3600)/60)}m` : "finish";
  const curMi = weeklyMileageKm ? (weeklyMileageKm/1.60934).toFixed(0) : category==="5K"?"15":category==="10K"?"20":category==="Half Marathon"?"25":"30";
  const curVolume = isTimeBased ? (weeklyHours ? weeklyHours+"h/week" : "3-4h/week") : curMi+"mi/week";

  const scheduleNotes = [
    hardDays?.length>0 ? `Hard days: ${hardDays.join(", ")}` : "",
    longRunDay ? `Long run day: ${longRunDay}` : "Long run day: Saturday",
    prioritize ? `Focus: ${prioritize}` : "",
  ].filter(Boolean).join(". ");

  const injuryLine = injuryConcerns
    ? `INJURY: "${injuryConcerns}" — cut all volume 15%, NO tempo or intervals for first 4 weeks, replace hard sessions with easy_run or cross_train, NEVER consecutive hard days.`
    : "";

  const fitnessLine = fitnessNotes
    ? `Athlete context: "${fitnessNotes}" — use this to calibrate week 1 starting volume and description tone.`
    : "";

  // Beginner absolute caps — prevent AI from defaulting to intermediate volumes
  const BEGINNER_DIST = {"5K":"1.5","10K":"2","Half Marathon":"2.5","Marathon":"3","Ultra":"3"};
  const BEGINNER_TIME = {"5K":"20","10K":"22","Half Marathon":"25","Marathon":"28","Ultra":"30"};
  const beginnerCap = isTimeBased
    ? `BEGINNER RULES: NO tempo, NO intervals for first 6 weeks. Easy runs only for weeks 1-4, add long_run in week 5. Max ${BEGINNER_TIME[category]||25} min per run in week 1. Max 90 min total week 1. Build max 10 min/week on long run. Descriptions must be encouraging: "Run at a pace you can hold a full conversation."`
    : `BEGINNER RULES: NO tempo, NO intervals for first 6 weeks. Easy runs only for weeks 1-4, add long_run in week 5. Max ${BEGINNER_DIST[category]||2} miles per run in week 1. Max 8 miles total week 1. Build max 0.5mi/week on long run. Descriptions must be encouraging: "Run at a pace you can hold a full conversation."`;
  const advancedNote = `ADVANCED: tempo from week 1, intervals from week 2, up to 3 quality sessions/week at peak.`;
  const levelRules = athleteLevel === "beginner" ? beginnerCap : athleteLevel === "advanced" ? advancedNote : "";

  const TIME_LONG_MAX = {"5K":45,"10K":65,"Half Marathon":95,"Marathon":155,"Ultra":185};
  const TIME_VOL = {"5K":"100-180","10K":"130-240","Half Marathon":"180-360","Marathon":"270-480","Ultra":"390-660"};
  const timeLongMax = TIME_LONG_MAX[category] || 95;
  const timeVol = TIME_VOL[category] || "180-360";
  const triathlonRules = isTriathlon ? "TRIATHLON: Every week must have swim+bike+run. Min 1 swim/week, 1-2 bikes, 1-2 runs, brick every 2 weeks. Types: swim/bike/easy_run/intervals/long_run/brick. NO running-only plan." : "";

  const coreRules = isTimeBased
    ? `PLAN TYPE: TIME-BASED — athlete has no GPS watch, cannot track miles.
- Every training workout MUST have distanceMiles:null and durationMin set to a positive integer.
- Race day only: distanceMiles:${distanceMiles}, durationMin:<estimated finish in minutes>.
- Describe ALL workouts in time: "40 minutes easy" NOT "5 miles easy".
- Long run max: ${timeLongMax} min. Weekly total: ${timeVol} min/week.
- Week 1 conservative. Build max 10% per week (minutes). Cutback every 3-4 weeks. Taper final 2 weeks.
- Last day of week ${weeks}: type:race, distanceMiles:${distanceMiles}, durationMin:estimated finish.
- Generate ONLY ${days} workout days/week. NO rest days in JSON.`
    : `RULES: Long run MAX ${g.maxMi}mi. Weekly ${g.wMi}mi. Peak ${g.pMi}mi. Workouts: ${g.workouts}. Week 1 conservative. Build max 10%/week. Cutback every 3-4 weeks. Taper final 2 weeks. Last day week ${weeks}: type:race distanceMiles:${distanceMiles}. Generate ONLY ${days} workout days/week. NO rest days in JSON. ${triathlonRules}`;

  const example = isTimeBased
    ? `[{"week":1,"day":"Tuesday","type":"easy_run","title":"Easy Run","description":"40 minutes easy, conversational pace","distanceMiles":null,"durationMin":40}]`
    : `[{"week":1,"day":"Tuesday","type":"easy_run","title":"Easy Run","description":"Easy conversational effort, 3 miles","distanceMiles":3,"durationMin":null}]`;

  const prompt = `You are an expert endurance coach. Build a ${weeks}-week ${category} training plan.

RACE: ${race.raceName}, ${distanceMiles} miles, goal: ${goalTime}
ATHLETE: ${curVolume} current, ${days} days/week, level: ${athleteLevel||"intermediate"}
SCHEDULE: ${scheduleNotes}
${injuryLine ? injuryLine+"\n" : ""}${fitnessLine ? fitnessLine+"\n" : ""}
${levelRules ? levelRules+"\n" : ""}${coreRules}

Return ONLY a JSON array, no markdown, no explanation:
${example}

Valid types: easy_run, tempo, intervals, long_run, cross_train, race${isTriathlon?", swim, bike, brick":""}. Keep descriptions under 12 words.`;
  try {
    const msg = await anthropic.messages.create({ model: g.model, max_tokens: g.maxTokens, messages: [{ role: "user", content: prompt }] });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    let cleaned = text.replace(/```json|```/g, "").trim();
    // Repair truncated JSON by closing any open array
    if (!cleaned.endsWith("]")) { const lastBrace = cleaned.lastIndexOf("}"); if (lastBrace > -1) cleaned = cleaned.substring(0, lastBrace+1) + "]"; }
    const workouts = JSON.parse(cleaned);
    const TIME_DUR_DEFAULT = {easy_run:40,long_run:70,tempo:35,intervals:40,cross_train:45};
    const validated = workouts.filter(w => w.type !== "rest").map(w => {
      let d = w.distanceMiles;
      if (w.type === "race") d = parseFloat(distanceMiles);
      else if (isTimeBased) d = null;
      else if (d > g.maxMi) d = g.maxMi;
      const dur = (isTimeBased && w.type !== "race" && !w.durationMin) ? (TIME_DUR_DEFAULT[w.type]||40) : (w.durationMin||null);
      return {...w, distanceMiles:d, durationMin:dur};
    });
    await prisma.trainingPlan.deleteMany({ where: { raceId: race.id } });
    const start = new Date();
    start.setDate(start.getDate() - start.getDay() + 1);
    const dm = { Monday:0, Tuesday:1, Wednesday:2, Thursday:3, Friday:4, Saturday:5, Sunday:6 };
    await prisma.trainingPlan.create({ data: { userId, raceId: race.id, workouts: { create: validated.map(w => { const d = new Date(start); d.setDate(start.getDate()+(w.week-1)*7+(dm[w.day]||0)); return { week:w.week, day:w.day, date:d, type:w.type, title:w.title, description:w.description, distanceKm:w.distanceMiles?w.distanceMiles*1.60934:null, durationMin:w.durationMin||null }; }) } } });
    await prisma.user.update({ where: { id: userId }, data: { planGenerationCount: { increment: 1 } } });
    return NextResponse.json({ ok: true });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}




