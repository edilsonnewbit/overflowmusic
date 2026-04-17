import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";

type Params = { params: Promise<{ rehearsalId: string; itemId: string }> };

function getAuth(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";
  return token
    ? { authMode: "user" as const, userToken: token }
    : { authMode: "admin" as const };
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { rehearsalId, itemId } = await context.params;
    const payload = await request.json();
    const res = await serverApiFetch(`rehearsals/${rehearsalId}/setlist/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      ...getAuth(request),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    const { rehearsalId, itemId } = await context.params;
    const res = await serverApiFetch(`rehearsals/${rehearsalId}/setlist/items/${itemId}`, {
      method: "DELETE",
      ...getAuth(request),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
