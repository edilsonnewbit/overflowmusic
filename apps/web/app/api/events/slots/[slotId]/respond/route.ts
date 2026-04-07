import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

type Params = {
  params: Promise<{ slotId: string }>;
};

export async function POST(request: NextRequest, context: Params) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const { slotId } = await context.params;
    const payload = await request.json();
    const res = await serverApiFetch(`events/slots/${slotId}/respond`, {
      method: "POST",
      body: JSON.stringify(payload),
      authMode: "user",
      userToken: token,
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
