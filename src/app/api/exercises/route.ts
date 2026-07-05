// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "";
const HOST = "exercisedb.p.rapidapi.com";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim().toLowerCase();
  if (!name) return NextResponse.json({ gifUrl: null });

  if (!RAPIDAPI_KEY) return NextResponse.json({ gifUrl: null });

  try {
    const encoded = encodeURIComponent(name);
    const res = await fetch(
      `https://${HOST}/exercises/name/${encoded}?limit=1&offset=0`,
      {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": HOST,
        },
        next: { revalidate: 86400 }, // Next.js data cache: re-fetch once per day
      }
    );

    if (!res.ok) return NextResponse.json({ gifUrl: null });
    const data = await res.json();
    const gifUrl = Array.isArray(data) ? (data[0]?.gifUrl ?? null) : null;

    return NextResponse.json(
      { gifUrl },
      { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ gifUrl: null });
  }
}
