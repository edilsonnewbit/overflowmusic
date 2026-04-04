import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const qs = searchParams.toString();
    const path = qs ? `songs?${qs}` : "songs";
    const response = await serverApiFetch(path, { method: "GET" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
