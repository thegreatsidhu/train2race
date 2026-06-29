export default function Loading() {
  return (
    <div className="max-w-2xl px-4 md:px-8 py-6 md:py-10">
      <div className="mb-8">
        <div className="h-3 w-28 bg-surface rounded-full animate-pulse mb-3" />
        <div className="h-8 w-52 bg-surface rounded-full animate-pulse mb-4" />
        <div className="flex gap-2">
          <div className="h-7 w-24 bg-surface rounded-full animate-pulse" />
          <div className="h-7 w-20 bg-surface rounded-full animate-pulse" />
        </div>
      </div>
      <div className="space-y-3 mb-8">
        {[1, 2].map(i => (
          <div key={i} className="h-14 rounded-2xl bg-surface animate-pulse" />
        ))}
      </div>
      <div className="h-28 rounded-2xl bg-surface animate-pulse mb-8" />
      <div className="space-y-3 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-surface animate-pulse" />
    </div>
  );
}
