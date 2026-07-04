import type { AdviceCard } from "@/generated/prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  training: "Training",
  recovery: "Recovery",
  sleep: "Sleep",
  cardiac_flag: "Cardiac trend",
  nutrition: "Nutrition",
  general: "General",
};

export function AdviceCardView({ card }: { card: AdviceCard }) {
  const isFlag = card.severity === "flag";

  return (
    <div
      className={`rounded-2xl border p-6 mb-6 ${
        isFlag ? "border-alert/40 bg-alert/[0.07]" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`font-data text-xs uppercase tracking-wide px-2 py-1 rounded-full ${
            isFlag ? "bg-alert/15 text-alert" : "bg-signal/15 text-signal"
          }`}
        >
          {CATEGORY_LABELS[card.category] ?? card.category}
        </span>
        {isFlag && (
          <span className="text-xs text-alert font-medium">Consider mentioning this to a doctor</span>
        )}
      </div>
      <h3 className="text-lg font-semibold tracking-tight mb-2">{card.headline}</h3>
      <p className="text-foreground-dim leading-relaxed text-sm whitespace-pre-wrap">{card.body}</p>
    </div>
  );
}
