import { NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ songId: string }> },
) {
  const { songId } = await params;
  try {
    const response = await serverApiFetch(`songs/${songId}`, { method: "GET" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
