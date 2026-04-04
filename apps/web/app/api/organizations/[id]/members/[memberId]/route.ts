import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: { id: string; memberId: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json() as unknown;
  const upstream = await serverApiFetch(`organizations/${params.id}/members/${params.memberId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    authMode: "admin",
  });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const upstream = await serverApiFetch(`organizations/${params.id}/members/${params.memberId}`, {
    method: "DELETE",
    authMode: "admin",
  });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}
