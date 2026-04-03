import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const response = await serverApiFetch("songs/import/txt/file/preview", {
      method: "POST",
      body: formData,
    });

    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
