import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, LOGIN_STATUS_HINT_COOKIE, LoginStatusHint } from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
    if (!token) {
      return NextResponse.json({ ok: false, message: "not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as { name?: string; instruments?: string[] };
    if (!body.name && !body.instruments) {
      return NextResponse.json({ ok: false, message: "name or instruments required" }, { status: 400 });
    }

    const payload: { name?: string; instruments?: string[] } = {};
    if (body.name && typeof body.name === "string" && body.name.trim()) {
      payload.name = body.name.trim();
    }
    if (Array.isArray(body.instruments)) {
      payload.instruments = body.instruments;
    }

    const response = await serverApiFetch("auth/me", {
      method: "PATCH",
      authMode: "user",
      userToken: token,
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

function readStatusHint(request: NextRequest): LoginStatusHint | null {
  const raw = request.cookies.get(LOGIN_STATUS_HINT_COOKIE)?.value || "";
  if (raw === "PENDING_APPROVAL" || raw === "REJECTED") {
    return raw;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const statusHint = readStatusHint(request);
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
    if (!token) {
      // Retorna 200 (não 401) para que o browser não logue erro no console —
      // o AuthProvider checa body.user, não o status HTTP.
      return NextResponse.json({ ok: false, message: "not authenticated", statusHint }, { status: 200 });
    }

    const response = await serverApiFetch("auth/me", {
      method: "GET",
      authMode: "user",
      userToken: token,
    });

    const body = await response.json();
    if (response.ok) {
      const nextResponse = NextResponse.json({ ...body, statusHint: null }, { status: 200 });
      nextResponse.cookies.delete(LOGIN_STATUS_HINT_COOKIE);
      return nextResponse;
    }

    const nextResponse = NextResponse.json({ ...body, statusHint }, { status: response.status });
    nextResponse.cookies.delete(ACCESS_TOKEN_COOKIE);
    return nextResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
