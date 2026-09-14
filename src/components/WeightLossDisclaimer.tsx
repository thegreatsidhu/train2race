// Prominent, visually distinct medical disclaimer for the weight-loss flow — deliberately
// not styled like the small fine-print nutrition disclaimer elsewhere in the plan page.
export function WeightLossDisclaimer() {
  return (
    <div className="rounded-2xl border-2 border-alert/50 bg-alert/10 p-4 flex items-start gap-3">
      <span className="text-xl shrink-0">⚠️</span>
      <p className="text-sm font-medium text-foreground leading-relaxed">
        This is not medical advice. Consult a doctor before starting any weight-loss program, especially if you have underlying health conditions.
      </p>
    </div>
  );
}
