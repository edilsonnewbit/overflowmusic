import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const response = await serverApiFetch(`auditions/${id}/status`, {
      method: "PATCH",
      authMode: "admin",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
