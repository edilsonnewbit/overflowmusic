import { NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function GET() {
  try {
    const response = await serverApiFetch("admin/dashboard", { method: "GET" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
