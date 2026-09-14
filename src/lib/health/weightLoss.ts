// Deterministic BMR/TDEE-based calorie target for weight-loss plans — never AI-generated,
// so the safety-critical number can't drift from what a real formula would say.

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  "Not very active": 1.2,
  "A little active (1-2x/week)": 1.375,
  "Moderately active (3-4x/week)": 1.55,
  "Very active (5+/week)": 1.725,
};

const LB_PER_KG = 2.20462;
const DEFAULT_AGE = 30;
const WEEKLY_LOSS_TARGET_LBS = 1; // fixed, conservative — see plan notes
const DAILY_DEFICIT_KCAL = 500; // 500 kcal/day ≈ 1 lb/week
const MIN_CALORIES = 1200;

function ageFromDob(dateOfBirth: Date | string | null | undefined): number {
  if (!dateOfBirth) return DEFAULT_AGE;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return DEFAULT_AGE;
  const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
  return age > 0 ? age : DEFAULT_AGE;
}

function sexConstant(sex: string | null | undefined): number {
  if (sex === "male") return 5;
  if (sex === "female") return -161;
  return -78; // unknown/other — average of the male/female constants
}

export interface CalorieTargetInput {
  weightKg: number;
  heightCm: number;
  dateOfBirth?: Date | string | null;
  sex?: string | null;
  currentFitness: string;
}

export interface CalorieTargetResult {
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  weeklyLossTargetLbs: number;
}

export function computeCalorieTarget(input: CalorieTargetInput): CalorieTargetResult {
  const { weightKg, heightCm, dateOfBirth, sex, currentFitness } = input;
  const age = ageFromDob(dateOfBirth);
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant(sex);
  const multiplier = ACTIVITY_MULTIPLIERS[currentFitness] ?? 1.375;
  const tdee = bmr * multiplier;
  const floor = Math.max(MIN_CALORIES, Math.round(bmr * 0.8));
  const dailyCalorieTarget = Math.max(floor, Math.round(tdee - DAILY_DEFICIT_KCAL));
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyCalorieTarget,
    weeklyLossTargetLbs: WEEKLY_LOSS_TARGET_LBS,
  };
}

export function calorieFloor(bmr: number): number {
  return Math.max(MIN_CALORIES, Math.round(bmr * 0.8));
}

export type CheckInSeverity = "none" | "moderate" | "severe";

export interface CheckInEvaluation {
  deltaLbs: number;
  deltaPct: number;
  severity: CheckInSeverity;
  message: string | null;
  suggestAdjustment: boolean;
}

// recentCheckIns must be sorted newest-first and NOT include the just-submitted weigh-in.
export function evaluateWeightCheckIn(opts: {
  previousWeightKg: number;
  currentWeightKg: number;
  // Weight at the check-in (or plan start) BEFORE previousWeightKg's own check-in — i.e. the
  // baseline previousWeightKg's weekly delta was itself measured against. null/undefined when
  // there isn't at least one full prior week of history to compare against.
  priorWeightKg?: number | null;
}): CheckInEvaluation {
  const { previousWeightKg, currentWeightKg, priorWeightKg } = opts;
  const deltaLbs = (previousWeightKg - currentWeightKg) * LB_PER_KG;
  const deltaPct = previousWeightKg > 0 ? (deltaLbs / LB_PER_KG / previousWeightKg) * 100 : 0;

  let severity: CheckInSeverity = "none";
  let message: string | null = null;

  if (deltaLbs > 3) {
    severity = "severe";
  } else if (deltaLbs > 2) {
    severity = "moderate";
  }

  // Sustained-rate rule: this week's loss AND the prior week's loss were each >1% of body
  // weight — more medically meaningful than a flat lb threshold, since it scales per person.
  if (deltaPct > 1 && priorWeightKg != null && priorWeightKg > 0) {
    const priorDeltaPct = ((priorWeightKg - previousWeightKg) / priorWeightKg) * 100;
    if (priorDeltaPct > 1) {
      severity = "severe";
    }
  }

  if (severity === "severe") {
    message = `You lost about ${deltaLbs.toFixed(1)} lb this week, faster than the recommended 1-2 lb/week pace. This isn't necessarily a problem, but a rapid rate of loss like this is worth mentioning to a doctor before continuing your plan.`;
  } else if (severity === "moderate") {
    message = `You lost about ${deltaLbs.toFixed(1)} lb this week — a bit faster than the recommended 1-2 lb/week pace. Keep an eye on it; if this continues, consider checking in with a doctor.`;
  }

  const suggestAdjustment = deltaLbs <= 0;

  return { deltaLbs, deltaPct, severity, message, suggestAdjustment };
}
