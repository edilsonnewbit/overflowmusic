import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const res = await serverApiFetch("admin/dashboard", { method: "GET", authMode: "admin" });
    if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
    const body = (await res.json()) as unknown;
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
