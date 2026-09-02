export function Toggle({ checked, onChange, className = "" }: { checked: boolean; onChange: () => void; className?: string }) {
  return (
    <div
      onClick={onChange}
      className={"relative w-10 h-5 rounded-full transition-colors shrink-0 " + (checked ? "bg-signal" : "bg-border") + (className ? " " + className : "")}
    >
      <div className={"absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform " + (checked ? "left-5" : "left-0.5")} />
    </div>
  );
}
