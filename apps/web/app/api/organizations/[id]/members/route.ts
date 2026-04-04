import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as unknown;
  const upstream = await serverApiFetch(`organizations/${id}/members`, {
    method: "POST",
    body: JSON.stringify(body),
    authMode: "admin",
  });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}
