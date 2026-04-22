import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const qs = searchParams.toString();
    const path = qs ? `pads?${qs}` : "pads";
    const response = await serverApiFetch(path, { method: "GET", authMode: "none" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await serverApiFetch("pads", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
