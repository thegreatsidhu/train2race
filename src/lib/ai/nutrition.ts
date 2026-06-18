export interface WorkoutInput {
  type: string;
  durationMin: number;
  intensityLabel: "easy" | "moderate" | "hard" | "race";
  weightKg: number;
  heatIndex?: "normal" | "hot";
}

export interface FuelingPhase {
  title: string;
  timing: string;
  items: FuelingItem[];
  notes?: string;
}

export interface FuelingItem {
  nutrient: string;
  amount: string;
  examples: string;
}

export interface NutritionPlan {
  workout: string;
  phases: FuelingPhase[];
  dailyProteinG: number;
  dailyWaterOz: number;
  raceDay: boolean;
}

const SWEAT_RATE: Record<string, number> = {
  easy: 0.6,
  moderate: 0.9,
  hard: 1.2,
  race: 1.4,
};

function carbBurnRate(type: string, intensity: string): number {
  const base: Record<string, number> = {
    easy: 0.5,
    moderate: 0.85,
    hard: 1.1,
    race: 1.3,
  };
  const typeMultiplier: Record<string, number> = {
    run: 1.0,
    ride: 0.85,
    swim: 0.9,
    strength: 0.5,
    other: 0.7,
  };
  return (base[intensity] ?? 0.85) * (typeMultiplier[type] ?? 0.8);
}

export function computeNutritionPlan(input: WorkoutInput): NutritionPlan {
  const { type, durationMin, intensityLabel, weightKg, heatIndex = "normal" } = input;
  const weightLbs = weightKg * 2.20462;
  const raceDay = intensityLabel === "race";
  const heatMult = heatIndex === "hot" ? 1.3 : 1.0;

  const sweatRateLhr = SWEAT_RATE[intensityLabel] * heatMult;
  const totalFluidLost = (sweatRateLhr * durationMin) / 60;
  const totalFluidOz = Math.round(totalFluidLost * 33.814);

  const carbsPerMin = carbBurnRate(type, intensityLabel);
  const totalCarbsBurned = Math.round(carbsPerMin * durationMin);
  void totalCarbsBurned;

  const preCarbs = durationMin < 45 ? 0
    : Math.round(weightKg * (intensityLabel === "race" ? 3.5 : intensityLabel === "hard" ? 2.5 : 1.5));

  const duringCarbsPerHr = durationMin < 60 ? 0
    : intensityLabel === "race" ? 80
    : intensityLabel === "hard" ? 65
    : intensityLabel === "moderate" ? 45 : 30;
  const duringCarbs = Math.round((duringCarbsPerHr * durationMin) / 60);

  const postCarbs = Math.round(weightKg * (raceDay ? 1.2 : 1.0));
  const postProtein = Math.round(weightKg * (intensityLabel === "hard" || raceDay ? 0.4 : 0.3));
  const dailyProteinG = Math.round(weightKg * (raceDay ? 2.0 : 1.7));

  const sodiumPerHr = Math.round((600 + weightKg * 5) * heatMult);
  const totalSodiumMg = Math.round((sodiumPerHr * durationMin) / 60);
  const totalPotassiumMg = Math.round((220 * durationMin) / 60);
  const magnesiumMg = durationMin >= 90 ? 200 : 0;

  const duringFluidOzPerHr = Math.round(sweatRateLhr * 33.814 * heatMult);
  const dailyWaterOz = Math.round(weightLbs * 0.5 + totalFluidOz * 0.8);

  const phases: FuelingPhase[] = [];

  const preItems: FuelingItem[] = [];
  if (preCarbs > 0) {
    preItems.push({
      nutrient: "Carbohydrates",
      amount: `${preCarbs}g`,
      examples: raceDay
        ? "White rice, banana, white toast with honey, sports drink"
        : "Oatmeal, banana, toast with jam, rice cakes",
    });
  }
  preItems.push({
    nutrient: "Fluid",
    amount: `${Math.round(weightKg * 5.5)} ml (${Math.round(weightKg * 0.19)} oz)`,
    examples: "Water or electrolyte drink",
  });
  if (durationMin >= 60) {
    preItems.push({
      nutrient: "Sodium",
      amount: "300–500 mg",
      examples: "Pinch of salt in water, electrolyte tablet, pretzels",
    });
  }
  phases.push({
    title: "Pre-Workout",
    timing: raceDay ? "3–4 hours before, then a small top-up 30–60 min out"
      : durationMin < 45 ? "Light snack 30 min before if hungry"
      : "1–3 hours before",
    items: preItems,
    notes: preCarbs === 0 ? "Short session — no carb loading needed. Stay hydrated."
      : raceDay ? "Race morning: eat early, keep it familiar, nothing new."
      : "Stick to easy-to-digest foods. Avoid high-fat and high-fiber within 1 hr of start.",
  });

  if (durationMin >= 45) {
    const duringItems: FuelingItem[] = [];
    duringItems.push({
      nutrient: "Fluid",
      amount: `${duringFluidOzPerHr} oz per hour`,
      examples: heatIndex === "hot"
        ? "Sports drink or water + electrolyte tabs — drink to thirst, don't wait"
        : "Water or sports drink — sip every 15–20 min",
    });
    if (duringCarbs > 0) {
      duringItems.push({
        nutrient: "Carbohydrates",
        amount: `${duringCarbs}g total (${duringCarbsPerHr}g/hr)`,
        examples: type === "run" ? "Gels, chews, sports drink, dates"
          : type === "ride" ? "Gels, rice cakes, banana, sports drink, bars"
          : "Sports drink, gels if available",
      });
    }
    if (durationMin >= 60) {
      duringItems.push({
        nutrient: "Sodium",
        amount: `${sodiumPerHr} mg/hr (${totalSodiumMg} mg total)`,
        examples: "Electrolyte drink, salt tabs, gels with sodium",
      });
    }
    if (durationMin >= 90) {
      duringItems.push({
        nutrient: "Potassium",
        amount: `${totalPotassiumMg} mg total`,
        examples: "Electrolyte drink or tabs containing potassium",
      });
    }
    if (magnesiumMg > 0) {
      duringItems.push({
        nutrient: "Magnesium",
        amount: `${magnesiumMg} mg`,
        examples: "Electrolyte drink with magnesium, or supplement post-workout",
      });
    }
    phases.push({
      title: "During Workout",
      timing: durationMin < 60 ? "Start sipping after 20 min"
        : "Start fueling by 20–30 min in, don't wait until you're hungry",
      items: duringItems,
      notes: raceDay ? "Stick to products you've trained with. Nothing new on race day."
        : durationMin >= 90 ? "Set a timer every 20 min as a fueling reminder."
        : undefined,
    });
  }

  const postItems: FuelingItem[] = [
    {
      nutrient: "Carbohydrates",
      amount: `${postCarbs}g`,
      examples: raceDay ? "White rice, pasta, bread, chocolate milk, recovery shake"
        : "Rice, potato, pasta, fruit, chocolate milk",
    },
    {
      nutrient: "Protein",
      amount: `${postProtein}g`,
      examples: "Chicken, eggs, Greek yogurt, protein shake, cottage cheese, tofu",
    },
    {
      nutrient: "Fluid",
      amount: `${Math.round(totalFluidOz * 1.5)} oz (replace 150% of losses)`,
      examples: "Water, chocolate milk, or electrolyte drink",
    },
    {
      nutrient: "Sodium",
      amount: "500–1000 mg",
      examples: "Salty food, electrolyte drink — helps retain fluids",
    },
  ];
  if (durationMin >= 90 || raceDay) {
    postItems.push({
      nutrient: "Potassium",
      amount: "400–600 mg",
      examples: "Banana, sweet potato, orange juice, coconut water",
    });
  }
  phases.push({
    title: "Post-Workout",
    timing: "Within 30 minutes",
    items: postItems,
    notes: raceDay ? "After a race: don't skip eating even if you're not hungry."
      : "The 30-min window matters most after hard efforts.",
  });

  return { workout: `${durationMin}-min ${intensityLabel} ${type}`, phases, dailyProteinG, dailyWaterOz, raceDay };
}