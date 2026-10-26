import { NextResponse } from "next/server";
import { VideoError } from "./job-assets";

export function videoError(error: unknown) {
  if (error instanceof VideoError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: "Không xử lý được video. Kiểm tra file và thử lại." }, { status: 500 });
}
