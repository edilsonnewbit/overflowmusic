import { NextRequest } from "next/server";

const API_BASE = (process.env.API_INTERNAL_URL ?? "").replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return new Response(JSON.stringify({ ok: false, message: "fileId obrigatório" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Try NestJS backend proxy first (when API_INTERNAL_URL is configured)
  if (API_BASE) {
    try {
      const upstream = await fetch(
        `${API_BASE}/audio-proxy?fileId=${encodeURIComponent(fileId)}`,
        { cache: "no-store" },
      );
      if (upstream.ok) {
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "audio/mpeg",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } catch {
      // fall through to direct fetch below
    }
  }

  // Fallback: fetch directly from Google Drive (works for "anyone with link" files)
  try {
    const driveUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`;
    const driveRes = await fetch(driveUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    if (!driveRes.ok) {
      return new Response(JSON.stringify({ ok: false, message: `Drive retornou ${driveRes.status}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contentType = driveRes.headers.get("content-type") ?? "audio/mpeg";

    if (contentType.includes("text/html")) {
      return new Response(
        JSON.stringify({ ok: false, message: "Arquivo requer confirmação no Drive. Verifique as permissões de compartilhamento." }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(driveRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, message: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
