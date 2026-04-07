import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";
  if (!token) {
    return NextResponse.json({ ok: false, invites: [] }, { status: 401 });
  }

  try {
    const res = await serverApiFetch("events/my-invites", {
      method: "GET",
      authMode: "user",
      userToken: token,
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, invites: [] }, { status: 500 });
  }
}
