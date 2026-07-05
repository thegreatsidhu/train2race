// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function ext(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/heic" || mimeType === "image/heif") return "heic";
  return "jpg";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "File must be JPG, PNG, or HEIC" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });

  const key = `activities/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext(file.type)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: bytes,
    ContentType: file.type,
    ContentLength: bytes.length,
  }));

  const url = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  return NextResponse.json({ url });
}
