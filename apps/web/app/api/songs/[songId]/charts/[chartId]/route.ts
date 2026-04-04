import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ songId: string; chartId: string }> },
) {
  try {
    const { songId, chartId } = await params;
    const payload = await request.json();
    const response = await serverApiFetch(`songs/${songId}/charts/${chartId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
