import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildResponse, handleApiError, failure } from "@/lib/api/response";
import { requireAdmin } from "@/lib/api/auth";
import { StudentService, DomainError } from "@/services/StudentService";

const updateStudentSchema = z.object({
  matric_number: z
    .string()
    .min(1, "Matriculation number is required")
    .optional(),
  first_name: z.string().min(1, "First name is required").optional(),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  parent_email: z.string().email("Invalid parent email address").optional(),
  parent_phone: z.string().min(1, "Parent phone is required").optional(),
  level: z.number().int().min(100).max(500).optional(),
  gender: z.enum(["male", "female"]).optional(),
  department: z.string().min(1, "Department is required").optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await requireAdmin();

    const service = new StudentService();
    const student = await service.getById(id);
    if (!student) {
      return failure({
        code: "NOT_FOUND",
        message: "Student not found",
        status: 404,
      });
    }

    return NextResponse.json(buildResponse({ data: student }));
  } catch (error) {
    return handleApiError(error, "students/:id.GET");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await requireAdmin({ role: "superadmin" });

    const body = await request.json();
    const validationResult = updateStudentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    const service = new StudentService();
    const updated = await service.update(id, updateData);

    return NextResponse.json(buildResponse({ data: updated }));
  } catch (error: any) {
    return handleApiError(error, "students/:id.PUT");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await requireAdmin({ role: "superadmin" });

    const service = new StudentService();
    const student = await service.getById(id);
    if (!student) {
      return failure({
        code: "NOT_FOUND",
        message: "Student not found",
        status: 404,
      });
    }

    await service.softDelete(id);

    return NextResponse.json(
      buildResponse({
        data: {
          message: `Student "${student.full_name}" (${student.matric_number}) has been successfully deactivated.`,
        },
      })
    );
  } catch (error: any) {
    return handleApiError(error, "students/:id.DELETE");
  }
}
