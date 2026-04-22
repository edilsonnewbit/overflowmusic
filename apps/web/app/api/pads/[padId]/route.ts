import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ padId: string }> },
) {
  const { padId } = await params;
  try {
    const body = await request.json();
    const response = await serverApiFetch(`pads/${padId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ padId: string }> },
) {
  const { padId } = await params;
  try {
    const response = await serverApiFetch(`pads/${padId}`, { method: "DELETE" });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
