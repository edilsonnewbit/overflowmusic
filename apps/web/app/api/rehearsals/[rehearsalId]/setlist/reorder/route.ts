import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";

type Params = { params: Promise<{ rehearsalId: string }> };

export async function POST(request: NextRequest, context: Params) {
  try {
    const { rehearsalId } = await context.params;
    const payload = await request.json();
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";
    const authOptions = token
      ? { authMode: "user" as const, userToken: token }
      : { authMode: "admin" as const };
    const res = await serverApiFetch(`rehearsals/${rehearsalId}/setlist/reorder`, {
      method: "POST",
      body: JSON.stringify(payload),
      ...authOptions,
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
