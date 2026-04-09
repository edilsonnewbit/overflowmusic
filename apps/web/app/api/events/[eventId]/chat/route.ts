import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";
import { cookies } from "next/headers";

type Params = { params: Promise<{ eventId: string }> };

async function getUserToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("session_token")?.value ?? null;
}

/** GET /api/events/[eventId]/chat — listar mensagens */
export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const token = await getUserToken();
  try {
    const res = await serverApiFetch(`events/${eventId}/chat`, {
      method: "GET",
      authMode: token ? "user" : "none",
      userToken: token ?? undefined,
      cache: "no-store",
    } as Parameters<typeof serverApiFetch>[1]);
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

/** POST /api/events/[eventId]/chat — enviar mensagem */
export async function POST(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const token = await getUserToken();
  if (!token) return NextResponse.json({ ok: false, message: "unauthenticated" }, { status: 401 });
  try {
    const payload = await req.json();
    const res = await serverApiFetch(`events/${eventId}/chat`, {
      method: "POST",
      body: JSON.stringify(payload),
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
