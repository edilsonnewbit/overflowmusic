import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: NextRequest, context: Params) {
  try {
    const { userId } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const response = await serverApiFetch(`admin/users/${userId}/approve`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
