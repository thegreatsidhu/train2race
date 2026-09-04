export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-signal/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-signal/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-signal/60 animate-bounce" />
      </div>
    </div>
  );
}
