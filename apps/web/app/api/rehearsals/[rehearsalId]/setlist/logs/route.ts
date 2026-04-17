import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ rehearsalId: string }> };

export async function GET(request: NextRequest, context: Params) {
  try {
    const { rehearsalId } = await context.params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const res = await serverApiFetch(
      `rehearsals/${rehearsalId}/setlist/logs${query ? `?${query}` : ""}`,
      { method: "GET" },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
