// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MODEL, SONNET_MODEL } from "@/lib/ai/client";
const anthropic = new Anthropic();
const G = {"5K":{model:HAIKU_MODEL,maxTokens:1200,maxWeeks:6,maxMi:5,wMi:"15-25",pMi:"20-25",w:"intervals 400m, tempo 2-3mi, easy 2-4mi"},"10K":{model:HAIKU_MODEL,maxTokens:1500,maxWeeks:8,maxMi:7,wMi:"20-35",pMi:"25-35",w:"tempo 3-4mi, 1K intervals, easy 3-5mi"},"Half Marathon":{model:HAIKU_MODEL,maxTokens:2500,maxWeeks:12,maxMi:13,wMi:"25-45",pMi:"35-45",w:"long 8-12mi, tempo 4-6mi, easy 4-7mi"},"Marathon":{model:SONNET_MODEL,maxTokens:4000,maxWeeks:16,maxMi:22,wMi:"35-55",pMi:"45-55",w:"long 14-22mi, marathon pace, easy 5-10mi"},"Ultra":{model:SONNET_MODEL,maxTokens:5000,maxWeeks:18,maxMi:30,wMi:"40-70",pMi:"55-70",w:"back-to-back longs, trail"},"Triathlon":{model:SONNET_MODEL,maxTokens:5000,maxWeeks:16,maxMi:13,wMi:"varies",pMi:"multi",w:"swim/bike/run, bricks"}};
function cat(d,t){if(t)return"Triathlon";if(d<=5500)return"5K";if(d<=11000)return"10K";if(d<=22000)return"Half Marathon";if(d<=43000)return"Marathon";return"Ultra";}
export async function POST(req,{params}){
  const{id}=await params;
  const session=await auth();
  const userId=session.user.id;
  const race=await prisma.raceTarget.findUnique({where:{id,userId}});
  if(!race)return NextResponse.json({error:"Not found"},{status:404});
  const body=await req.json();
  const{weeklyMileageKm,recentRaceTime,trainingDaysPerWeek,raceType,isTriathlon,hardDays,longRunDay,injuryConcerns,fitnessNotes,prioritize}=body;
  const c=cat(race.distanceM,isTriathlon);
  const g=G[c];
  const days=Number(trainingDaysPerWeek)||5;
  const actualW=Math.round((new Date(race.raceDate).getTime()-Date.now())/(7*24*60*60*1000));
  const weeks=Math.min(Math.max(4,actualW),g.maxWeeks);
  const mi=(race.distanceM/1609.34).toFixed(1);
  const goal=race.goalTimeSec?`${Math.floor(race.goalTimeSec/3600)}h ${Math.floor((race.goalTimeSec%3600)/60)}m`:"finish";
  const curMi=weeklyMileageKm?(weeklyMileageKm/1.60934).toFixed(0):c==="5K"?"15":c==="10K"?"20":c==="Half Marathon"?"25":"30";
  const notes=[hardDays?.length>0?`Hard days:${hardDays.join(",")}`:"",longRunDay?`Long run:${longRunDay}`:"Long run:Saturday",injuryConcerns?`Injuries:${injuryConcerns}`:"",fitnessNotes?`Fitness:${fitnessNotes}`:"",prioritize?`Focus:${prioritize}`:""].filter(Boolean).join(". ");
  const prompt=`Expert coach. ${weeks}-week ${c} plan. Race:${race.raceName} ${mi}mi goal ${goal}. Athlete:${curMi}mi/week ${days}days/week. ${notes}\nRULES: Long run MAX ${g.maxMi}mi NEVER exceed. Weekly ${g.wMi}mi. Peak ${g.pMi}mi. Key workouts:${g.w}. Week 1 at/below current mileage. Max 10% build/week. Cutback week every 3-4 weeks. Last 2 weeks taper. Generate ONLY ${days} workout days per week NO rest days.\nReturn ONLY JSON array:[{"week":1,"day":"Tuesday","type":"easy_run","title":"Easy Run","description":"details","distanceMiles":3,"durationMin":null}]\nTypes:easy_run/tempo/intervals/long_run/cross_train. No markdown.`;
  try{
    const msg=await anthropic.messages.create({model:g.model,max_tokens:g.maxTokens,messages:[{role:"user",content:prompt}]});
    const text=msg.content[0].type==="text"?msg.content[0].text:"";
    const workouts=JSON.parse(text.replace(/```json|```/g,"").trim());
    const v=workouts.filter(w=>w.type!=="rest").map(w=>({...w,distanceMiles:w.distanceMiles>g.maxMi?g.maxMi:w.distanceMiles}));
    await prisma.trainingPlan.deleteMany({where:{raceId:race.id}});
    const start=new Date();
    start.setDate(start.getDate()-start.getDay()+1);
    const dm={Monday:0,Tuesday:1,Wednesday:2,Thursday:3,Friday:4,Saturday:5,Sunday:6};
    await prisma.trainingPlan.create({data:{userId,raceId:race.id,workouts:{create:v.map(w=>{const d=new Date(start);d.setDate(start.getDate()+(w.week-1)*7+(dm[w.day]||0));return{week:w.week,day:w.day,date:d,type:w.type,title:w.title,description:w.description,distanceKm:w.distanceMiles?w.distanceMiles*1.60934:null,durationMin:w.durationMin||null};})}}});
    return NextResponse.json({ok:true});
  }catch(e){return NextResponse.json({error:e.message},{status:500});}
}
