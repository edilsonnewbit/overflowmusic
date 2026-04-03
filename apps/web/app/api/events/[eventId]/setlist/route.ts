import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_request: NextRequest, context: Params) {
  try {
    const { eventId } = await context.params;
    const response = await serverApiFetch(`events/${eventId}/setlist`, { method: "GET" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Params) {
  try {
    const { eventId } = await context.params;
    const payload = await request.json();
    const response = await serverApiFetch(`events/${eventId}/setlist`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
