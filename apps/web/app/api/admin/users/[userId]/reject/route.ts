import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

type Params = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: NextRequest, context: Params) {
  try {
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";
    if (!token) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

    const meRes = await serverApiFetch("auth/me", { method: "GET", authMode: "user", userToken: token });
    const me = (await meRes.json()) as { user?: { role?: string } };
    if (me.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
    }

    const { userId } = await context.params;
    const response = await serverApiFetch(`admin/users/${userId}/reject`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
