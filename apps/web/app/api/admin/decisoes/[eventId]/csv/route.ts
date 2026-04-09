import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ eventId: string }> };

/** GET /api/admin/decisoes/[eventId]/csv — exportar CSV */
export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  try {
    const res = await serverApiFetch(`decisions/event/${eventId}/csv`, {
      method: "GET",
      authMode: "admin",
    });
    const csvText = await res.text();
    return new NextResponse(csvText, {
      status: res.status,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="decisoes-${eventId}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
