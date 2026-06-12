import { NextResponse } from "next/server";

import {
  addStaff,
  listStaff,
  removeStaff,
  updateStaff,
} from "@/lib/server/clinical-store";
import { mapStaffDto, parseStaffInput } from "@/lib/server/dto/staff";
import type { ShiftStaffRole, ShiftStaffStatus } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(listStaff().map(mapStaffDto));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải nhân sự ca trực." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name: string;
      role: ShiftStaffRole;
      zone_code: string;
      status?: ShiftStaffStatus;
    };

    if (!body.name?.trim() || !body.role || !body.zone_code?.trim()) {
      return NextResponse.json(
        { error: "name, role, and zone_code are required." },
        { status: 400 },
      );
    }

    const member = addStaff(parseStaffInput(body));
    return NextResponse.json(mapStaffDto(member), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể thêm nhân sự." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id: string;
      zone_code?: string;
      status?: ShiftStaffStatus;
      name?: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const updated = updateStaff(body.id, {
      zoneCode: body.zone_code,
      status: body.status,
      name: body.name,
    });

    if (!updated) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    return NextResponse.json(mapStaffDto(updated));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể cập nhật nhân sự." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query param is required." }, { status: 400 });
    }

    const removed = removeStaff(id);
    if (!removed) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể xóa nhân sự." },
      { status: 500 },
    );
  }
}
