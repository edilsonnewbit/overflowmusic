import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { userId } = await context.params;
    const body = (await request.json()) as { role?: string; instruments?: string[] };
    const response = await serverApiFetch(`admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
