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
  // Desired weekly loss rate driving the deficit — defaults to the conservative 1 lb/week
  // pace when omitted. Callers with a user-chosen target weight/date pass the pace implied
  // by that goal instead (see evaluateGoalPace) — it's still floored below, so a target that
  // would require an unsafe deficit just gets capped rather than honored outright.
  desiredWeeklyLossLbs?: number;
}

export interface CalorieTargetResult {
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  weeklyLossTargetLbs: number; // the achievable pace at dailyCalorieTarget, post-floor
}

export function computeCalorieTarget(input: CalorieTargetInput): CalorieTargetResult {
  const { weightKg, heightCm, dateOfBirth, sex, currentFitness, desiredWeeklyLossLbs } = input;
  const age = ageFromDob(dateOfBirth);
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant(sex);
  const multiplier = ACTIVITY_MULTIPLIERS[currentFitness] ?? 1.375;
  const tdee = bmr * multiplier;
  const floor = Math.max(MIN_CALORIES, Math.round(bmr * 0.8));
  const deficit = Math.max(0, desiredWeeklyLossLbs ?? WEEKLY_LOSS_TARGET_LBS) * DAILY_DEFICIT_KCAL;
  const dailyCalorieTarget = Math.max(floor, Math.round(tdee - deficit));
  const weeklyLossTargetLbs = Math.max(0, (tdee - dailyCalorieTarget) / DAILY_DEFICIT_KCAL);
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyCalorieTarget,
    weeklyLossTargetLbs: Math.round(weeklyLossTargetLbs * 100) / 100,
  };
}

export function calorieFloor(bmr: number): number {
  return Math.max(MIN_CALORIES, Math.round(bmr * 0.8));
}

export type GoalPaceSafety = "safe" | "aggressive" | "unsafe";

export interface GoalPaceEvaluation {
  weeksToGoal: number;
  impliedWeeklyLossLbs: number;
  safety: GoalPaceSafety;
  message: string | null;
}

// Evaluates the weekly pace implied by a user-chosen target weight + target date. This is
// about the GOAL itself (set once, at plan creation) — separate from evaluateWeightCheckIn,
// which monitors actual measured week-to-week loss against the medically-recommended pace
// regardless of what goal the user set.
export function evaluateGoalPace(opts: {
  startWeightKg: number;
  targetWeightKg: number;
  targetDate: Date | string;
}): GoalPaceEvaluation {
  const { startWeightKg, targetWeightKg, targetDate } = opts;
  const msToGoal = new Date(targetDate).getTime() - Date.now();
  const weeksToGoal = Math.max(1 / 7, msToGoal / (7 * 24 * 3600 * 1000)); // floor at 1 day out
  const totalLossLbs = (startWeightKg - targetWeightKg) * LB_PER_KG;
  const impliedWeeklyLossLbs = totalLossLbs / weeksToGoal;

  let safety: GoalPaceSafety = "safe";
  let message: string | null = null;

  if (impliedWeeklyLossLbs > 3) {
    safety = "unsafe";
    message = `To hit this target by this date, you'd need to lose about ${impliedWeeklyLossLbs.toFixed(1)} lb/week on average — well beyond the generally recommended 1-2 lb/week pace. Consider a later target date or consulting a doctor before pursuing this goal.`;
  } else if (impliedWeeklyLossLbs > 2) {
    safety = "aggressive";
    message = `To hit this target by this date, you'd need to lose about ${impliedWeeklyLossLbs.toFixed(1)} lb/week on average — faster than the recommended 1-2 lb/week pace. This may be difficult to sustain safely through diet alone.`;
  } else if (impliedWeeklyLossLbs < 0) {
    message = `Your target weight is higher than your current weight, so this isn't a weight-loss goal.`;
  }

  return { weeksToGoal, impliedWeeklyLossLbs: Math.round(impliedWeeklyLossLbs * 100) / 100, safety, message };
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
