import { NextRequest, NextResponse } from "next/server";

const API_INTERNAL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://music.overflowmvmt.com/api";

// ─── Rate limiter simples por IP ──────────────────────────────────────────────
// Funciona bem para instância única em Docker. Limite: 3 envios por IP por hora.

const RATE_LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

const submissionMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = submissionMap.get(ip);

  if (!entry || now > entry.resetAt) {
    submissionMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

// Limpa entradas expiradas periodicamente para não acumular memória
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of submissionMap.entries()) {
    if (now > entry.resetAt) submissionMap.delete(ip);
  }
}, WINDOW_MS);

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/audicao
 * Proxy público para POST /api/auditions no backend.
 * Lê o body como ArrayBuffer e repassa com o Content-Type original (multipart/form-data).
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSeconds } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Tente novamente em alguns minutos." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }

  try {
    const target = `${API_INTERNAL.replace(/\/$/, "")}/auditions`;
    const contentType = request.headers.get("content-type") ?? "";

    // ArrayBuffer lê o body completo incluindo o arquivo de vídeo
    const bodyBuffer = await request.arrayBuffer();

    const response = await fetch(target, {
      method: "POST",
      body: bodyBuffer,
      headers: { "content-type": contentType },
    });

    // Lê como text primeiro para evitar body already consumed em caso de erro de parse
    const responseText = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(responseText);
    } catch {
      // NestJS retornou resposta não-JSON (ex: erro HTML do multer)
      return NextResponse.json(
        { ok: false, message: `Erro interno: ${responseText.slice(0, 300)}` },
        { status: 500 }
      );
    }

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
