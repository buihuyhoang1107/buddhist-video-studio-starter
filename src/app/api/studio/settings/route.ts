import { NextResponse } from "next/server";
import { ValidationError } from "yup";
import { saveStudioSettings } from "@/server/studio/settings";
import { studioStatus } from "@/server/studio/status";

export const runtime = "nodejs";

export async function GET() { return NextResponse.json(await studioStatus()); }

export async function PUT(request: Request) {
  try { return NextResponse.json(await saveStudioSettings(await request.json())); }
  catch (error) {
    return NextResponse.json({ error: error instanceof ValidationError ? error.errors.join(" ") : "Không lưu được cấu hình dịch vụ." }, { status: 400 });
  }
}
