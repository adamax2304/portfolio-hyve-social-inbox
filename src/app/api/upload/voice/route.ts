import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { auth } from "@/auth";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Persists a voice blob to the local filesystem under public/uploads/voice/
 * and returns its public URL. For dev/demo use — production should swap
 * out for S3/R2/Supabase Storage.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too big" }, { status: 413 });
  }

  // Detect extension
  const mime = file.type || "audio/webm";
  const ext =
    mime.includes("ogg") ? "ogg" :
    mime.includes("mp4") ? "m4a" :
    mime.includes("mpeg") ? "mp3" :
    "webm";

  const buf = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "voice");
  await mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, filename), buf);

  const url = `/uploads/voice/${filename}`;
  return NextResponse.json({ ok: true, url, size: buf.length, type: mime });
}

export const dynamic = "force-dynamic";
