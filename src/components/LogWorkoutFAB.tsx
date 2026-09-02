"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function LogWorkoutFAB() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard/log-workout")) return null;

  return (
    <Link
      href="/dashboard/log-workout"
      aria-label="Log workout"
      className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 flex w-14 h-14 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg shadow-black/25 active:scale-95 transition-transform"
      style={{ fontSize: 32, lineHeight: 1, fontWeight: 300 }}
    >
      +
    </Link>
  );
}
