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
  const recentPlan = await prisma.trainingPlan.findFirst({ where: { raceId: race.id, createdAt: { gte: new Date(Date.now()-5*60*1000) } }, select: { id: true } });
  if (recentPlan) return NextResponse.json({ error: "Please wait 5 minutes before regenerating" }, { status: 429 });
  const body = await req.json();
  const { weeklyMileageKm, recentRaceTime, trainingDaysPerWeek, hardDays, longRunDay, injuryConcerns, fitnessNotes, prioritize } = body;
  const isTriathlon = race.isTriathlon || false;
  const category = getCategory(race.distanceM, isTriathlon);
  const g = RACE_GUIDELINES[category];
  const days = Number(trainingDaysPerWeek) || 5;
  const actualWeeks = Math.round((new Date(race.raceDate).getTime() - Date.now()) / (7*24*60*60*1000));
  if (actualWeeks < g.minWeeks) return NextResponse.json({ error: `Need at least ${g.minWeeks} weeks for a ${category}. Your race is ${actualWeeks} weeks away.` }, { status: 400 });
  const weeks = Math.min(Math.max(4, actualWeeks), g.maxWeeks);
  const distanceMiles = (race.distanceM / 1609.34).toFixed(1);
  const goalTime = race.goalTimeSec ? `${Math.floor(race.goalTimeSec/3600)}h ${Math.floor((race.goalTimeSec%3600)/60)}m` : "finish";
  const curMi = weeklyMileageKm ? (weeklyMileageKm/1.60934).toFixed(0) : category==="5K"?"15":category==="10K"?"20":category==="Half Marathon"?"25":"30";
  const notes = [
    hardDays?.length>0 ? `Hard days: ${hardDays.join(", ")}` : "",
    longRunDay ? `Long run: ${longRunDay}` : "Long run: Saturday",
    injuryConcerns ? `INJURY ALERT - "${injuryConcerns}": reduce volume 10-15%, avoid aggravating workouts, substitute with cross-training, never back-to-back hard days` : "",
    fitnessNotes ? `Fitness: ${fitnessNotes}` : "",
    prioritize ? `Focus: ${prioritize}` : "",
  ].filter(Boolean).join(". ");
  const triathlonRules = isTriathlon ? "TRIATHLON: Every week must have swim+bike+run. Min 1 swim/week, 1-2 bikes, 1-2 runs, brick every 2 weeks. Types: swim/bike/easy_run/intervals/long_run/brick. NO running-only plan." : "";
  const prompt = `Expert coach. ${weeks}-week ${category} plan. Race: ${race.raceName} ${distanceMiles}mi goal ${goalTime}. Athlete: ${curMi}mi/week ${days}days/week. ${notes}
RULES: Long run MAX ${g.maxMi}mi NEVER exceed. Weekly ${g.wMi}mi. Peak ${g.pMi}mi. Workouts: ${g.workouts}. Week 1 conservative. Max 10% build/week. Cutback every 3-4 weeks. Last 2 weeks taper. Generate ONLY ${days} workout days/week NO rest days. Keep descriptions under 12 words. ${triathlonRules}
Return ONLY JSON array: [{"week":1,"day":"Tuesday","type":"easy_run","title":"Easy Run","description":"Easy pace conversational effort","distanceMiles":3,"durationMin":null}]
Types: easy_run/tempo/intervals/long_run/cross_train${isTriathlon?"/swim/bike/brick":""}. No markdown.`;
  try {
    const msg = await anthropic.messages.create({ model: g.model, max_tokens: g.maxTokens, messages: [{ role: "user", content: prompt }] });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    let cleaned = text.replace(/```json|```/g, "").trim();
    // Repair truncated JSON by closing any open array
    if (!cleaned.endsWith("]")) { const lastBrace = cleaned.lastIndexOf("}"); if (lastBrace > -1) cleaned = cleaned.substring(0, lastBrace+1) + "]"; }
    const workouts = JSON.parse(cleaned);
    const validated = workouts.filter(w => w.type !== "rest").map(w => ({ ...w, distanceMiles: w.distanceMiles > g.maxMi ? g.maxMi : w.distanceMiles }));
    await prisma.trainingPlan.deleteMany({ where: { raceId: race.id } });
    const start = new Date();
    start.setDate(start.getDate() - start.getDay() + 1);
    const dm = { Monday:0, Tuesday:1, Wednesday:2, Thursday:3, Friday:4, Saturday:5, Sunday:6 };
    await prisma.trainingPlan.create({ data: { userId, raceId: race.id, workouts: { create: validated.map(w => { const d = new Date(start); d.setDate(start.getDate()+(w.week-1)*7+(dm[w.day]||0)); return { week:w.week, day:w.day, date:d, type:w.type, title:w.title, description:w.description, distanceKm:w.distanceMiles?w.distanceMiles*1.60934:null, durationMin:w.durationMin||null }; }) } } });
    return NextResponse.json({ ok: true });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}




