import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ rehearsalId: string }> };

export async function GET(_request: NextRequest, context: Params) {
  try {
    const { rehearsalId } = await context.params;
    const res = await serverApiFetch(`rehearsals/${rehearsalId}/setlist`, { method: "GET" });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
