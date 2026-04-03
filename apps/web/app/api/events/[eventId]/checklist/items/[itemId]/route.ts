import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = {
  params: Promise<{ eventId: string; itemId: string }>;
};

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { eventId, itemId } = await context.params;
    const payload = await request.json();

    const response = await serverApiFetch(`events/${eventId}/checklist/items/${itemId}`, {
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
