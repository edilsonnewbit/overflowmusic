import { NextResponse } from "next/server";

export async function GET() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  if (!clientId) {
    return NextResponse.json({ ok: false, message: "GOOGLE_CLIENT_ID is not configured" }, { status: 500 });
  }

  const explicitFallback = process.env.WEB_LOGIN_FALLBACK_ENABLED === "true";
  const devBootstrapFallback = process.env.NODE_ENV !== "production" && process.env.AUTH_BOOTSTRAP_MODE === "true";
  const fallbackEnabled = explicitFallback || devBootstrapFallback;

  return NextResponse.json({ ok: true, clientId, fallbackEnabled });
}
