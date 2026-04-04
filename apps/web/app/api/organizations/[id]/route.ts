import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const upstream = await serverApiFetch(`organizations/${params.id}`, { authMode: "none" });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json() as unknown;
  const upstream = await serverApiFetch(`organizations/${params.id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    authMode: "admin",
  });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const upstream = await serverApiFetch(`organizations/${params.id}`, {
    method: "DELETE",
    authMode: "admin",
  });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}
