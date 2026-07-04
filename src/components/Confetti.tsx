"use client";
import { useEffect, useState } from "react";

const COLORS = [
  "#5ec9b5", "#f59e0b", "#ef4444", "#8b5cf6",
  "#3b82f6", "#ec4899", "#10b981", "#f97316",
];

interface Piece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  round: boolean;
}

export function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!active) { setPieces([]); return; }
    const p: Piece[] = Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 1.8,
      duration: 2.2 + Math.random() * 1.8,
      size: 6 + Math.floor(Math.random() * 7),
      round: Math.random() > 0.6,
    }));
    setPieces(p);
    const t = setTimeout(() => setPieces([]), 5000);
    return () => clearTimeout(t);
  }, [active]);

  if (!pieces.length) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: "fixed",
            left: `${p.x}%`,
            top: "-14px",
            width: `${p.size}px`,
            height: `${p.size * (p.round ? 1 : 1.6)}px`,
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            opacity: 1,
          }}
        />
      ))}
    </div>
  );
}
