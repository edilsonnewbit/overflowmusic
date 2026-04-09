import { NextRequest, NextResponse } from "next/server";

const API_INTERNAL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://music.overflowmvmt.com/api";

/**
 * POST /api/audicao
 * Proxy público para POST /api/auditions no backend.
 * Repassa o stream bruto do request (multipart/form-data) sem re-parsear em memória,
 * o que é necessário para uploads de vídeo grandes.
 */
export async function POST(request: NextRequest) {
  try {
    const target = `${API_INTERNAL.replace(/\/$/, "")}/auditions`;

    const contentType = request.headers.get("content-type") ?? "";

    // duplex: "half" é necessário para enviar ReadableStream como body no Node.js 18+
    const fetchOptions: RequestInit & { duplex?: string } = {
      method: "POST",
      body: request.body,
      headers: { "content-type": contentType },
      duplex: "half",
    };

    const response = await fetch(target, fetchOptions);

    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
