import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const response = await serverApiFetch("auth/resend-verification", {
      method: "POST",
      authMode: "none",
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
