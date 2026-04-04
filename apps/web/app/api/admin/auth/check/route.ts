import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function GET(req: NextRequest) {
  const incoming = req.headers.get("authorization") || "";
  const adminKey = process.env.ADMIN_API_KEY || "";
  if (!adminKey || incoming !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const upstream = await serverApiFetch("api/admin/auth/check", {
    authMode: "admin",
  });
  const data = await upstream.json() as unknown;
  return NextResponse.json(data, { status: upstream.status });
}
