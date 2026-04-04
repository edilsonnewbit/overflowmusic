import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  try {
    const { songId } = await params;
    const response = await serverApiFetch(`songs/${songId}/charts`, { method: "GET", authMode: "none" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
