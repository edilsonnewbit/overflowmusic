import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ songId: string }> };

export async function POST(request: NextRequest, context: Params) {
  try {
    const { songId } = await context.params;
    const body = await request.json();
    const res = await serverApiFetch(`songs/${songId}/tracks/bulk`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}
