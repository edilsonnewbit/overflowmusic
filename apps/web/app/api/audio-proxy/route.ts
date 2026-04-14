import { NextRequest } from "next/server";

const API_BASE = (process.env.API_INTERNAL_URL ?? "http://api:3001").replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return new Response(JSON.stringify({ ok: false, message: "fileId obrigatório" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(`${API_BASE}/api/audio-proxy?fileId=${encodeURIComponent(fileId)}`, {
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
