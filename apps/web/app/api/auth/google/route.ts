import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  LOGIN_STATUS_HINT_COOKIE,
  LOGIN_STATUS_HINT_TTL_SECONDS,
  LoginStatusHint,
} from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

function isLoginStatusHint(value: unknown): value is LoginStatusHint {
  return value === "PENDING_APPROVAL" || value === "REJECTED";
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const response = await serverApiFetch("auth/google", {
      method: "POST",
      authMode: "none",
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      console.error("[auth/google] API error:", response.status, JSON.stringify(body));
    }

    const nextResponse = NextResponse.json(body, { status: response.status });

    if (response.ok && body?.status === "APPROVED" && typeof body?.accessToken === "string") {
      nextResponse.cookies.set(ACCESS_TOKEN_COOKIE, body.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ACCESS_TOKEN_TTL_SECONDS,
      });
      nextResponse.cookies.delete(LOGIN_STATUS_HINT_COOKIE);
      return nextResponse;
    }

    if (response.ok && isLoginStatusHint(body?.status)) {
      nextResponse.cookies.set(LOGIN_STATUS_HINT_COOKIE, body.status, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: LOGIN_STATUS_HINT_TTL_SECONDS,
      });
      nextResponse.cookies.delete(ACCESS_TOKEN_COOKIE);
      return nextResponse;
    }

    return nextResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
