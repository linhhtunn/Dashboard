import { NextRequest, NextResponse } from "next/server";

import { listMockPatientItems } from "@/lib/mock/patient-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const payload = listMockPatientItems({
      query: request.nextUrl.searchParams.get("query"),
      status: request.nextUrl.searchParams.get("status"),
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai danh sach benh nhan." },
      { status: 500 },
    );
  }
}
