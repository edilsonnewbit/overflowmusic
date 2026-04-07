import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ eventId: string; rehearsalId: string }> };

export async function DELETE(_request: NextRequest, context: Params) {
  try {
    const { eventId, rehearsalId } = await context.params;
    const response = await serverApiFetch(`events/${eventId}/rehearsals/${rehearsalId}`, {
      method: "DELETE",
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
