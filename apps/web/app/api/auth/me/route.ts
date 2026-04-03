import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, LOGIN_STATUS_HINT_COOKIE, LoginStatusHint } from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

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
      return NextResponse.json({ ok: false, message: "not authenticated", statusHint }, { status: 401 });
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
