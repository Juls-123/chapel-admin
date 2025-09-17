import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";

// Lightweight domain error compatible with response handler
export class DomainError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ListStudentsParams {
  page: number;
  limit: number;
  search?: string;
  matric?: string;
  level?: string | null;
  status?: string; // 'all' | 'active' | 'inactive'
  department?: string | null;
}

export interface UploadMetadata {
  fileName?: string;
  fileSize?: number;
  student_upload_id?: string; // domain-specific upload linkage for error logging
}

export interface CreateStudentInput {
  matric_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email?: string | null;
  parent_email: string;
  parent_phone: string;
  level: number; // code e.g. 100, 200
  gender: "male" | "female";
  department: string;
}

export interface StudentRecord {
  upload_batch_id: null;
  level_id: string;
  id: string;
  matric_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  email: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  gender: "male" | "female";
  department: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  level?: number | null;
  level_name?: string | null;
}

type StudentRow = Database["public"]["Tables"]["students"]["Row"];
type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];
type LevelRow = Database["public"]["Tables"]["levels"]["Row"];
type StudentUploadErrorInsert =
  Database["public"]["Tables"]["student_upload_errors"]["Insert"];

export class StudentService {
  private supabase: SupabaseClient<Database>;

  constructor(client?: SupabaseClient<Database>) {
    this.supabase =
      client ||
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
  }

  // Helpers
  private transformStudent(row: any): StudentRecord {
    return {
      id: row.id,
      matric_number: row.matric_number,
      first_name: row.first_name,
      middle_name: row.middle_name,
      last_name: row.last_name,
      full_name: row.full_name,
      email: row.email,
      parent_email: row.parent_email,
      parent_phone: row.parent_phone,
      gender: row.gender,
      department: row.department,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      level: row.levels?.code ? parseInt(row.levels.code) : null,
      level_name: row.levels?.name ?? null,
    } as StudentRecord;
  }

  async list(params: ListStudentsParams): Promise<{
    items: StudentRecord[];
    total: number;
  }> {
    const {
      page,
      limit,
      search = "",
      matric = "",
      level,
      status = "all",
      department,
    } = params;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from("students")
      .select(
        `
        id,
        matric_number,
        first_name,
        middle_name,
        last_name,
        full_name,
        email,
        parent_email,
        parent_phone,
        gender,
        department,
        status,
        created_at,
        updated_at,
        levels!students_level_id_fkey(code, name)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,matric_number.ilike.%${search}%,email.ilike.%${search}%,department.ilike.%${search}%`
      );
    }

    if (matric) {
      query = query.ilike("matric_number", `%${matric}%`);
    }

    if (level) {
      const { data: levelData } = await this.supabase
        .from("levels")
        .select("id")
        .eq("code", level)
        .single();
      if (levelData) {
        query = query.eq("level_id", levelData.id);
      }
    }

    if (department) {
      query = query.ilike("department", `%${department}%`);
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) {
      throw new DomainError(
        "LIST_STUDENTS_FAILED",
        "Failed to fetch students",
        500,
        error.message
      );
    }

    const items = (data || []).map((s: any) => this.transformStudent(s));
    return { items, total: count || 0 };
  }

  private async resolveLevelIdFromCode(levelCode: number): Promise<string> {
    const { data, error } = await this.supabase
      .from("levels")
      .select("id")
      .eq("code", levelCode.toString())
      .single();

    if (error) {
      throw new DomainError(
        "LEVEL_LOOKUP_FAILED",
        "Failed to validate academic level",
        500,
        error.message
      );
    }

    if (!data) {
      throw new DomainError(
        "INVALID_LEVEL",
        `Level ${levelCode} does not exist in the system. Please contact an administrator to add this level first.`,
        400
      );
    }

    return data.id;
  }

  async getById(id: string): Promise<StudentRecord | null> {
    const { data: student, error } = await this.supabase
      .from("students")
      .select(
        `
        id,
        matric_number,
        first_name,
        middle_name,
        last_name,
        full_name,
        email,
        parent_email,
        parent_phone,
        gender,
        department,
        status,
        created_at,
        updated_at,
        levels!students_level_id_fkey(code, name)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if ((error as any).code === "PGRST116") return null;
      throw new DomainError(
        "GET_STUDENT_FAILED",
        "Failed to fetch student",
        500,
        error.message
      );
    }

    return this.transformStudent(student);
  }

  async createSingle(input: CreateStudentInput, adminId: string) {
    // Check duplicates by matric
    const { data: existingStudent } = await this.supabase
      .from("students")
      .select("id, status")
      .eq("matric_number", input.matric_number)
      .single();

    if (existingStudent) {
      // Reactivate if inactive, else skip (return info)
      if (existingStudent.status === "inactive") {
        const updateData: StudentUpdate = {
          first_name: input.first_name,
          middle_name: input.middle_name || null,
          last_name: input.last_name,
          email: input.email,
          parent_email: input.parent_email,
          parent_phone: input.parent_phone,
          gender: input.gender,
          department: input.department,
          status: "active",
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await this.supabase
          .from("students")
          .update(updateData)
          .eq("id", existingStudent.id);

        if (updateError) {
          throw new DomainError(
            "REACTIVATE_FAILED",
            `Failed to reactivate student`,
            500,
            updateError.message
          );
        }

        // Return the now-active record
        const updated = await this.getById(existingStudent.id);
        return {
          student: updated!,
          duplicate: true,
          action: "reactivated" as const,
        };
      }

      return { student: null, duplicate: true, action: "skipped" as const };
    }

    const levelId = await this.resolveLevelIdFromCode(input.level);

    const insertData: StudentInsert = {
      matric_number: input.matric_number,
      first_name: input.first_name,
      middle_name: input.middle_name || null,
      last_name: input.last_name,
      email: input.email,
      parent_email: input.parent_email,
      parent_phone: input.parent_phone,
      level_id: levelId,
      gender: input.gender,
      department: input.department,
      status: "active",
    };

    const { data, error } = await this.supabase
      .from("students")
      .insert(insertData)
      .select(
        `
        id,
        matric_number,
        first_name,
        middle_name,
        last_name,
        full_name,
        email,
        parent_email,
        parent_phone,
        gender,
        department,
        status,
        created_at,
        levels!students_level_id_fkey(code, name)
      `
      );

    if (error) {
      throw new DomainError(
        "CREATE_STUDENT_FAILED",
        "Failed to create student",
        500,
        error.message
      );
    }

    const created = Array.isArray(data) ? data[0] : data;
    return {
      student: this.transformStudent(created),
      duplicate: false as const,
    };
  }

  async bulkCreate(
    inputs: CreateStudentInput[],
    adminId: string,
    upload?: UploadMetadata
  ): Promise<{
    results: StudentRecord[];
    errors: Array<{ student: string; matric_number: string; error: string }>;
    duplicates: Array<{
      student: string;
      matric_number: string;
      existing_status: string | null;
      action: "reactivated" | "skipped";
    }>;
    finalStatus: "completed" | "partial" | "failed";
  }> {
    // Validate unique levels exist first
    const uniqueLevels = [...new Set(inputs.map((s) => s.level.toString()))];
    const { data: existingLevels, error: levelFetchError } = await this.supabase
      .from("levels")
      .select("id, code")
      .in("code", uniqueLevels);

    if (levelFetchError) {
      throw new DomainError(
        "LEVELS_FETCH_FAILED",
        "Failed to validate academic levels",
        500,
        levelFetchError.message
      );
    }

    const levelMap = new Map(
      (existingLevels || []).map((l: any) => [l.code, l.id])
    );
    const invalidLevels = uniqueLevels.filter((code) => !levelMap.has(code));

    if (invalidLevels.length > 0) {
      // Log per-row invalid level errors if we have an upload id
      if (upload?.student_upload_id) {
        const invalidRows = inputs
          .map((s, idx) => ({ s, idx }))
          .filter(({ s }) => invalidLevels.includes(s.level.toString()))
          .map(({ s, idx }) => ({
            student_upload_id: upload!.student_upload_id!,
            row_number: idx + 2, // excel-style row (skip header)
            error_type: "validation_error",
            error_message: `Invalid academic level: ${s.level}`,
            raw_data: s as any,
          }));
        if (invalidRows.length > 0) {
          await this.supabase.from("student_upload_errors").insert(invalidRows);
        }
      }
      throw new DomainError(
        "INVALID_LEVELS",
        `The following levels do not exist in the system: ${invalidLevels.join(
          ", "
        )}. Please contact an administrator to add these levels first.`,
        400,
        { invalid_levels: invalidLevels }
      );
    }

    const results: StudentRecord[] = [];
    const errors: Array<{
      student: string;
      matric_number: string;
      error: string;
    }> = [];
    const duplicates: Array<{
      student: string;
      matric_number: string;
      existing_status: string | null;
      action: "reactivated" | "skipped";
    }> = [];

    for (let i = 0; i < inputs.length; i++) {
      const s = inputs[i];
      try {
        // Duplicate check
        const { data: existingStudent, error: checkError } = await this.supabase
          .from("students")
          .select("id, status, first_name, last_name")
          .eq("matric_number", s.matric_number)
          .single();

        if (existingStudent && !checkError) {
          duplicates.push({
            student: `${s.first_name} ${s.last_name}`,
            matric_number: s.matric_number,
            existing_status: existingStudent.status,
            action:
              existingStudent.status === "inactive" ? "reactivated" : "skipped",
          });

          if (existingStudent.status === "inactive") {
            const updateData: StudentUpdate = {
              first_name: s.first_name,
              middle_name: s.middle_name || null,
              last_name: s.last_name,
              email: s.email,
              parent_email: s.parent_email,
              parent_phone: s.parent_phone,
              gender: s.gender,
              department: s.department,
              status: "active",
              updated_at: new Date().toISOString(),
            };

            const { error: updateError } = await this.supabase
              .from("students")
              .update(updateData)
              .eq("id", existingStudent.id);

            if (updateError) {
              errors.push({
                student: `${s.first_name} ${s.last_name}`,
                matric_number: s.matric_number,
                error: `Failed to reactivate: ${updateError.message}`,
              });
              if (upload?.student_upload_id) {
                const errorRecord: StudentUploadErrorInsert = {
                  student_upload_id: upload.student_upload_id,
                  row_number: i + 2,
                  error_type: "reactivation_error",
                  error_message: `Failed to reactivate: ${updateError.message}`,
                  raw_data: s as any,
                };
                await this.supabase
                  .from("student_upload_errors")
                  .insert(errorRecord);
              }
            } else {
              const updated = await this.getById(existingStudent.id);
              if (updated) results.push(updated);
            }
          }

          continue;
        }

        const levelId = levelMap.get(s.level.toString());
        if (!levelId) {
          errors.push({
            student: `${s.first_name} ${s.last_name}`,
            matric_number: s.matric_number,
            error: `Invalid level: ${s.level}`,
          });
          if (upload?.student_upload_id) {
            const errorRecord: StudentUploadErrorInsert = {
              student_upload_id: upload.student_upload_id,
              row_number: i + 2,
              error_type: "validation_error",
              error_message: `Invalid academic level: ${s.level}`,
              raw_data: s as any,
            };
            await this.supabase
              .from("student_upload_errors")
              .insert(errorRecord);
          }
          continue;
        }

        const insertData: StudentInsert = {
          matric_number: s.matric_number,
          first_name: s.first_name,
          middle_name: s.middle_name || null,
          last_name: s.last_name,
          email: s.email,
          parent_email: s.parent_email,
          parent_phone: s.parent_phone,
          level_id: levelId,
          gender: s.gender,
          department: s.department,
          status: "active",
        };

        const { data: student, error: studentError } = await this.supabase
          .from("students")
          .insert(insertData)
          .select(
            `
            id,
            matric_number,
            first_name,
            middle_name,
            last_name,
            full_name,
            email,
            parent_email,
            parent_phone,
            gender,
            department,
            status,
            created_at,
            levels!students_level_id_fkey(code, name)
          `
          );

        if (studentError) {
          errors.push({
            student: `${s.first_name} ${s.last_name}`,
            matric_number: s.matric_number,
            error: studentError.message,
          });
          if (upload?.student_upload_id) {
            const errorRecord: StudentUploadErrorInsert = {
              student_upload_id: upload.student_upload_id,
              row_number: i + 2,
              error_type: "processing_error",
              error_message: studentError.message,
              raw_data: s as any,
            };
            await this.supabase
              .from("student_upload_errors")
              .insert(errorRecord);
          }
        } else {
          const created = Array.isArray(student) ? student[0] : student;
          results.push(this.transformStudent(created));
        }
      } catch (err: any) {
        errors.push({
          student: `${s.first_name} ${s.last_name}`,
          matric_number: s.matric_number,
          error: err?.message || "Unknown error",
        });
        if (upload?.student_upload_id) {
          const errorRecord: StudentUploadErrorInsert = {
            student_upload_id: upload.student_upload_id,
            row_number: i + 2,
            error_type: "processing_error",
            error_message: err?.message || "Unknown error",
            raw_data: s as any,
          };
          await this.supabase.from("student_upload_errors").insert(errorRecord);
        }
      }
    }

    const finalStatus: "completed" | "partial" | "failed" =
      errors.length === 0
        ? "completed"
        : results.length === 0
        ? "failed"
        : "partial";

    return { results, errors, duplicates, finalStatus };
  }

  async update(id: string, updates: Partial<CreateStudentInput>) {
    let levelId: string | undefined = undefined;
    if (typeof updates.level === "number") {
      levelId = await this.resolveLevelIdFromCode(updates.level);
    }

    const updateObject: StudentUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Remove level from updates since it's not a database field
    delete (updateObject as any).level;

    if (levelId) updateObject.level_id = levelId;

    const { data: updated, error } = await this.supabase
      .from("students")
      .update(updateObject)
      .eq("id", id)
      .select(
        `
        id,
        matric_number,
        first_name,
        middle_name,
        last_name,
        full_name,
        email,
        parent_email,
        parent_phone,
        gender,
        department,
        status,
        created_at,
        updated_at,
        levels!students_level_id_fkey(code, name)
      `
      )
      .single();

    if (error) {
      if ((error as any).code === "PGRST116") {
        throw new DomainError("NOT_FOUND", "Student not found", 404);
      }
      if ((error as any).code === "23505") {
        throw new DomainError(
          "DUPLICATE_ENTRY",
          "Duplicate matriculation number",
          409
        );
      }
      throw new DomainError(
        "UPDATE_STUDENT_FAILED",
        "Failed to update student",
        500,
        error.message
      );
    }

    return this.transformStudent(updated);
  }

  async softDelete(id: string) {
    const { error } = await this.supabase
      .from("students")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      if ((error as any).code === "23503") {
        throw new DomainError(
          "FK_CONSTRAINT",
          "This student has associated records and cannot be deleted",
          409
        );
      }
      throw new DomainError(
        "DELETE_STUDENT_FAILED",
        "Failed to delete student",
        500,
        error.message
      );
    }
  }
}
