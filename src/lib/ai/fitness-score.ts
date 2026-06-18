import type { MergedDayMetrics } from "@/lib/ai/metrics";

export interface DimensionScore {
  name: string;
  score: number;
  label: string;
  insight: string;
  trend: "improving" | "declining" | "stable" | "unknown";
}

export interface FitnessAssessment {
  overallScore: number;
  overallLabel: string;
  dimensions: DimensionScore[];
  dataQuality: "good" | "limited" | "insufficient";
  daysOfData: number;
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Great";
  if (score >= 55) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

function trend(recent: number[], older: number[]): "improving" | "declining" | "stable" | "unknown" {
  if (recent.length < 2 || older.length < 2) return "unknown";
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const delta = ((recentAvg - olderAvg) / olderAvg) * 100;
  if (delta > 5) return "improving";
  if (delta < -5) return "declining";
  return "stable";
}

function avg(values: (number | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function computeFitnessAssessment(history: MergedDayMetrics[]): FitnessAssessment {
  const daysOfData = history.length;
  const dataQuality = daysOfData >= 14 ? "good" : daysOfData >= 5 ? "limited" : "insufficient";

  const recent = history.slice(-7);
  const older = history.slice(-30, -7);

  const avgRhr = avg(recent.map((d) => d.restingHeartRate));
  let cardioScore = 60;
  if (avgRhr != null) {
    if (avgRhr < 50) cardioScore = 92;
    else if (avgRhr < 55) cardioScore = 82;
    else if (avgRhr < 60) cardioScore = 72;
    else if (avgRhr < 65) cardioScore = 60;
    else if (avgRhr < 70) cardioScore = 48;
    else if (avgRhr < 75) cardioScore = 38;
    else cardioScore = 25;
  }
  const cardioTrend = trend(
    recent.map((d) => d.restingHeartRate ?? 0).filter(Boolean),
    older.map((d) => d.restingHeartRate ?? 0).filter(Boolean)
  );
  const cardioTrendAdj = cardioTrend === "improving" ? "declining" : cardioTrend === "declining" ? "improving" : cardioTrend;

  const avgHrv = avg(recent.map((d) => d.hrvMs));
  const avgRecovery = avg(recent.map((d) => d.bodyBatteryOrRecoveryPct));
  let recoveryScore = 60;
  if (avgHrv != null) {
    if (avgHrv > 80) recoveryScore = 90;
    else if (avgHrv > 60) recoveryScore = 78;
    else if (avgHrv > 45) recoveryScore = 65;
    else if (avgHrv > 30) recoveryScore = 50;
    else if (avgHrv > 20) recoveryScore = 37;
    else recoveryScore = 22;
  }
  if (avgRecovery != null) {
    recoveryScore = Math.round(recoveryScore * 0.6 + avgRecovery * 0.4);
  }
  const recoveryTrend = trend(
    recent.map((d) => d.hrvMs ?? 0).filter(Boolean),
    older.map((d) => d.hrvMs ?? 0).filter(Boolean)
  );

  const avgSleepScore = avg(recent.map((d) => d.sleepScore));
  const avgSleepDuration = avg(recent.map((d) => d.sleepDurationMin));
  let sleepScore = 60;
  if (avgSleepScore != null) {
    sleepScore = Math.round(avgSleepScore);
  } else if (avgSleepDuration != null) {
    if (avgSleepDuration >= 420 && avgSleepDuration <= 540) sleepScore = 80;
    else if (avgSleepDuration >= 360) sleepScore = 60;
    else sleepScore = 35;
  }
  const sleepTrend = trend(
    recent.map((d) => d.sleepScore ?? d.sleepDurationMin ?? 0).filter(Boolean),
    older.map((d) => d.sleepScore ?? d.sleepDurationMin ?? 0).filter(Boolean)
  );

  const avgStrain = avg(recent.map((d) => d.strainOrLoadScore));
  const avgSteps = avg(recent.map((d) => d.steps));
  let trainingScore = 50;
  if (avgStrain != null) {
    if (avgStrain >= 12 && avgStrain <= 16) trainingScore = 85;
    else if (avgStrain >= 8) trainingScore = 70;
    else if (avgStrain >= 5) trainingScore = 55;
    else trainingScore = 35;
  } else if (avgSteps != null) {
    if (avgSteps >= 10000) trainingScore = 80;
    else if (avgSteps >= 7500) trainingScore = 65;
    else if (avgSteps >= 5000) trainingScore = 50;
    else trainingScore = 30;
  }
  const trainingTrend = trend(
    recent.map((d) => d.strainOrLoadScore ?? d.steps ?? 0).filter(Boolean),
    older.map((d) => d.strainOrLoadScore ?? d.steps ?? 0).filter(Boolean)
  );

  const activeDays = history.filter(
    (d) => d.restingHeartRate != null || d.steps != null || d.sleepScore != null
  ).length;
  const consistencyPct = daysOfData > 0 ? (activeDays / Math.max(daysOfData, 14)) * 100 : 0;
  const consistencyScore = Math.min(100, Math.round(consistencyPct));
  const consistencyTrend: "improving" | "stable" | "declining" | "unknown" =
    consistencyScore >= 80 ? "stable" : "unknown";

  const weights = [0.25, 0.25, 0.2, 0.2, 0.1];
  const scores = [cardioScore, recoveryScore, sleepScore, trainingScore, consistencyScore];
  const overallScore = Math.round(scores.reduce((sum, s, i) => sum + s * weights[i], 0));

  return {
    overallScore,
    overallLabel: scoreLabel(overallScore),
    daysOfData,
    dataQuality,
    dimensions: [
      {
        name: "Cardiovascular",
        score: cardioScore,
        label: scoreLabel(cardioScore),
        trend: cardioTrendAdj,
        insight: avgRhr != null
          ? `Your average resting HR is ${avgRhr.toFixed(0)} bpm over the last 7 days.`
          : "Not enough heart rate data yet.",
      },
      {
        name: "Recovery & HRV",
        score: recoveryScore,
        label: scoreLabel(recoveryScore),
        trend: recoveryTrend,
        insight: avgHrv != null
          ? `Average HRV of ${avgHrv.toFixed(0)} ms${avgRecovery != null ? ` and ${avgRecovery.toFixed(0)}% recovery score` : ""}.`
          : avgRecovery != null
          ? `Average recovery score of ${avgRecovery.toFixed(0)}%.`
          : "No HRV or recovery data yet.",
      },
      {
        name: "Sleep",
        score: sleepScore,
        label: scoreLabel(sleepScore),
        trend: sleepTrend,
        insight: avgSleepScore != null
          ? `Average sleep score of ${avgSleepScore.toFixed(0)}/100 over the last 7 days.`
          : avgSleepDuration != null
          ? `Averaging ${(avgSleepDuration / 60).toFixed(1)} hours of sleep per night.`
          : "No sleep data yet.",
      },
      {
        name: "Training Load",
        score: trainingScore,
        label: scoreLabel(trainingScore),
        trend: trainingTrend,
        insight: avgStrain != null
          ? `Average daily strain of ${avgStrain.toFixed(1)}/21.`
          : avgSteps != null
          ? `Averaging ${Math.round(avgSteps).toLocaleString()} steps per day.`
          : "No activity data yet.",
      },
      {
        name: "Consistency",
        score: consistencyScore,
        label: scoreLabel(consistencyScore),
        trend: consistencyTrend,
        insight: `Active data on ${activeDays} of the last ${daysOfData} tracked days.`,
      },
    ],
  };
}