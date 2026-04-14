import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ songId: string }> };

export async function GET(_req: NextRequest, context: Params) {
  try {
    const { songId } = await context.params;
    const res = await serverApiFetch(`songs/${songId}/tracks`, { method: "GET", authMode: "admin" });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Params) {
  try {
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });
    const { songId } = await context.params;
    const body = await request.json();
    const res = await serverApiFetch(`songs/${songId}/tracks`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });
    const { songId } = await context.params;
    const url = new URL(request.url);
    const trackId = url.searchParams.get("trackId");
    if (!trackId) return NextResponse.json({ ok: false, message: "trackId required" }, { status: 400 });
    const res = await serverApiFetch(`songs/${songId}/tracks/${trackId}`, { method: "DELETE" });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}
