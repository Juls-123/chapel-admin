import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { ServiceService } from "@/services/ServiceService";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") || "csv").toLowerCase() as
      | "csv"
      | "excel";

    const svc = new ServiceService();
    const { filename, mime, content } = await svc.exportAttendance(
      params.id,
      format
    );

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: (error as any)?.status || 500 }
    );
  }
}
