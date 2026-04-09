import { NextRequest, NextResponse } from "next/server";

const API_INTERNAL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://music.overflowmvmt.com/api";

/**
 * POST /api/audicao
 * Proxy público para POST /api/auditions no backend.
 * Repassa o multipart/form-data sem modificação.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const target = `${API_INTERNAL.replace(/\/$/, "")}/auditions`;

    const response = await fetch(target, {
      method: "POST",
      body: formData,
      // Não setar Content-Type manualmente — o browser/node define o boundary correto
    });

    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
