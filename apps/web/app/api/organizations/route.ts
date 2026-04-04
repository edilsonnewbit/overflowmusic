import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const path = `organizations${qs ? `?${qs}` : ""}`;
  const upstream = await serverApiFetch(path, { authMode: "none" });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as unknown;
  const upstream = await serverApiFetch("organizations", {
    method: "POST",
    body: JSON.stringify(body),
    authMode: "admin",
  });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}
