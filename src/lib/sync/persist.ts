import { DataSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedActivity, NormalizedDailyMetrics } from "@/lib/connectors/types";

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
    activities.map((a) =>
      prisma.activity.upsert({
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
      })
    )
  );
}