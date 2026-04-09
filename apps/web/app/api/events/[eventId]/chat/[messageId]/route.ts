import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";

type Params = { params: Promise<{ eventId: string; messageId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { eventId, messageId } = await params;
  const jar = await cookies();
  const token = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ ok: false, message: "unauthenticated" }, { status: 401 });
  try {
    const res = await serverApiFetch(`events/${eventId}/chat/${messageId}`, {
      method: "DELETE",
      authMode: "user",
      userToken: token,
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
