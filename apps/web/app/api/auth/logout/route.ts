import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, LOGIN_STATUS_HINT_COOKIE } from "@/lib/auth-cookie";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(LOGIN_STATUS_HINT_COOKIE);
  return response;
}
