import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { ServiceService } from "@/services/ServiceService";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(); // any admin can update status per workflow

    const body = await request.json();
    const schema = z.object({ status: z.enum(["completed", "canceled"]) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const service = new ServiceService();
    const result = await service.updateServiceStatus(
      params.id,
      parsed.data.status
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: (error as any)?.status || 500 }
    );
  }
}
