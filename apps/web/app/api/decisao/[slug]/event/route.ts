import { NextRequest, NextResponse } from "next/server";

const API =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://music.overflowmvmt.com/api";

type Params = { params: Promise<{ slug: string }> };

/** GET /api/decisao/[slug]/event — busca info pública do evento pelo slug */
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const res = await fetch(
      `${API.replace(/\/$/, "")}/decisions/event-by-slug/${slug}`,
      { cache: "no-store" },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
