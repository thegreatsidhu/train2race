import { DataSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedActivity, NormalizedDailyMetrics } from "@/lib/connectors/types";
import { findLikelyDuplicateActivity } from "@/lib/activities/dedupe";

export async function upsertDailyMetrics(
  userId: string,
  source: DataSource,
  metrics: NormalizedDailyMetrics[]
) {
  await Promise.all(
    metrics.map((m) => {
      const normalizedDate = new Date(m.date);
      normalizedDate.setHours(0, 0, 0, 0);
      return prisma.dailyMetrics.upsert({
        where: { userId_date_source: { userId, date: normalizedDate, source } },
        create: {
          userId, date: normalizedDate, source,
          restingHeartRate: m.restingHeartRate, avgHeartRate: m.avgHeartRate,
          maxHeartRate: m.maxHeartRate, hrvMs: m.hrvMs, hrvSdnnMs: m.hrvSdnnMs,
          sleepScore: m.sleepScore, sleepDurationMin: m.sleepDurationMin,
          sleepDeepMin: m.sleepDeepMin, sleepRemMin: m.sleepRemMin,
          sleepLightMin: m.sleepLightMin, sleepAwakeMin: m.sleepAwakeMin,
          respirationRate: m.respirationRate, spo2Pct: m.spo2Pct,
          bodyBatteryOrRecoveryPct: m.bodyBatteryOrRecoveryPct,
          strainOrLoadScore: m.strainOrLoadScore, steps: m.steps,
          activeCalories: m.activeCalories, totalCalories: m.totalCalories,
          vo2Max: m.vo2Max, bodyWeightKg: m.bodyWeightKg,
          stressLevel: m.stressLevel, raw: m.raw as never,
        },
        update: {
          restingHeartRate: m.restingHeartRate, avgHeartRate: m.avgHeartRate,
          maxHeartRate: m.maxHeartRate, hrvMs: m.hrvMs, hrvSdnnMs: m.hrvSdnnMs,
          sleepScore: m.sleepScore, sleepDurationMin: m.sleepDurationMin,
          sleepDeepMin: m.sleepDeepMin, sleepRemMin: m.sleepRemMin,
          sleepLightMin: m.sleepLightMin, sleepAwakeMin: m.sleepAwakeMin,
          respirationRate: m.respirationRate, spo2Pct: m.spo2Pct,
          bodyBatteryOrRecoveryPct: m.bodyBatteryOrRecoveryPct,
          strainOrLoadScore: m.strainOrLoadScore, steps: m.steps,
          activeCalories: m.activeCalories, totalCalories: m.totalCalories,
          vo2Max: m.vo2Max, bodyWeightKg: m.bodyWeightKg,
          stressLevel: m.stressLevel, raw: m.raw as never,
        },
      });
    })
  );
}

export async function upsertActivities(
  userId: string,
  source: DataSource,
  activities: NormalizedActivity[]
) {
  await Promise.all(
    activities.map(async (a) => {
      // An update (existing source+externalId) should always go through — only skip when this
      // would be a brand-new row that duplicates a workout already recorded via another source
      // (e.g. entered by hand, then also arriving here from a webhook sync).
      const existing = await prisma.activity.findUnique({
        where: { source_externalId: { source, externalId: a.externalId } },
        select: { id: true },
      });
      if (!existing) {
        const dup = await findLikelyDuplicateActivity(userId, a.startTime, source);
        if (dup) return; // same real-world workout already recorded from another source — skip silently
      }
      return prisma.activity.upsert({
        where: { source_externalId: { source, externalId: a.externalId } },
        create: {
          userId, source, externalId: a.externalId, type: a.type,
          startTime: a.startTime, durationSec: Math.round(a.durationSec),
          distanceM: a.distanceM, avgHeartRate: a.avgHeartRate,
          maxHeartRate: a.maxHeartRate, avgPaceSecPerKm: a.avgPaceSecPerKm,
          elevationGainM: a.elevationGainM, calories: a.calories,
          trainingLoad: a.trainingLoad, title: a.title, raw: a.raw as never,
        },
        update: {
          durationSec: Math.round(a.durationSec), distanceM: a.distanceM,
          avgHeartRate: a.avgHeartRate, maxHeartRate: a.maxHeartRate,
          avgPaceSecPerKm: a.avgPaceSecPerKm, elevationGainM: a.elevationGainM,
          calories: a.calories, trainingLoad: a.trainingLoad,
          title: a.title, raw: a.raw as never,
        },
      });
    })
  );
}