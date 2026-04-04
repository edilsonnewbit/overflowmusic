import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json() as unknown;
  const upstream = await serverApiFetch(`organizations/${params.id}/members`, {
    method: "POST",
    body: JSON.stringify(body),
    authMode: "admin",
  });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}
