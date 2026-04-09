import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ eventId: string }> };

/** GET /api/admin/decisoes?eventId=xxx */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  try {
    const res = await serverApiFetch(`decisions/event/${eventId}`, {
      method: "GET",
      authMode: "admin",
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
