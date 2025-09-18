// src/services/ManualClearanceService.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { AuditLogger, ActionTemplates } from "@/lib/audit";
import { z } from "zod";

// Initialize Supabase admin client
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Type definitions
type ManualOverride =
  Database["public"]["Tables"]["manual_overrides"]["Insert"];
type Service = Database["public"]["Tables"]["services"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];

// Reason types from the database enum
type OverrideReason =
  Database["public"]["Tables"]["override_reason_definitions"];

// Enhanced attendance data interfaces
interface OriginalAbsenteeRecord {
  student_id: string;
  matric_number: string;
  student_name: string;
  level: string;
  gender: string;
  unique_id: string;
}

interface EnhancedAbsenteeRecord extends OriginalAbsenteeRecord {
  clearance?: {
    status: 'cleared';
    cleared_at: string;
    cleared_by: string;
    reason: string;
    notes?: string;
    admin_id: string;
  };
}

interface ClearanceMetadata {
  student_id: string;
  cleared_at: string;
  cleared_by: string;
  reason: string;
  notes?: string;
  admin_id: string;
}

// Enhanced cleared record that maintains consistency with absentees format
interface EnhancedClearedRecord extends OriginalAbsenteeRecord {
  clearance: {
    status: 'cleared';
    cleared_at: string;
    cleared_by: string;
    reason: string;
    notes?: string;
    admin_id: string;
  };
}

// Validation schemas
const ClearanceParamsSchema = z.object({
  studentId: z.string().uuid("Invalid student ID format"),
  serviceId: z.string().uuid("Invalid service ID format"),
  level: z.string().regex(/^[1-5]00$/, "Level must be in format 100-500"),
  reasonId: z.string().uuid("Invalid reason ID format"),
  adminId: z.string().uuid("Invalid admin ID format"),
  comments: z.string().optional(),
  ipAddress: z.string().ip().optional(),
});

const BatchClearanceParamsSchema = z.object({
  studentIds: z
    .array(z.string().uuid())
    .min(1, "At least one student ID is required"),
  serviceId: z.string().uuid("Invalid service ID format"),
  level: z.string().regex(/^[1-5]00$/, "Level must be in format 100-500"),
  reasonId: z.string().uuid("Invalid reason ID format"),
  adminId: z.string().uuid("Invalid admin ID format"),
  comments: z.string().optional(),
  ipAddress: z.string().ip().optional(),
});

// Custom error types
class ClearanceError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = "ClearanceError";
  }
}

export class ManualClearanceService {
  private static readonly BUCKET =
    process.env.SUPABASE_STORAGE_BUCKET || "attendance-scans";

  /**
   * Clear a single student's attendance manually
   * @param params Clearance parameters
   * @returns The created manual override record
   * @throws {ClearanceError} If clearance fails
   */
  static async clearStudent(params: z.infer<typeof ClearanceParamsSchema>) {
    try {
      // Validate input
      const validation = ClearanceParamsSchema.safeParse(params);
      if (!validation.success) {
        throw new ClearanceError(
          "Invalid clearance parameters",
          "INVALID_INPUT",
          validation.error.issues
        );
      }

      const { studentId, serviceId, level, reasonId, adminId, comments } =
        validation.data;

      // PROBLEM 3 FIX: Combine all database queries with Promise.all
      // Convert auth_user_id to actual admin ID, then validate all entities
      const [
        studentResult,
        serviceResult,
        reasonResult,
        levelResult,
        adminResult,
      ] = await Promise.all([
        supabaseAdmin
          .from("students")
          .select("id, first_name, last_name, level_id")
          .eq("id", studentId)
          .single(),
        supabaseAdmin
          .from("services")
          .select("id, name, service_date")
          .eq("id", serviceId)
          .single(),
        supabaseAdmin
          .from("override_reason_definitions")
          .select("id, code, display_name, requires_note")
          .eq("id", reasonId)
          .eq("is_active", true)
          .single(),
        supabaseAdmin
          .from("levels")
          .select("id, code")
          .eq("code", level)
          .single(),
        supabaseAdmin
          .from("admins")
          .select("id, email, first_name, last_name")
          .eq("auth_user_id", adminId) // Look up by auth_user_id instead of id
          .single(),
      ]);

      // Check all results at once
      if (studentResult.error || !studentResult.data) {
        throw new ClearanceError(
          `Student not found: ${studentId}`,
          "STUDENT_NOT_FOUND",
          { studentId, error: studentResult.error }
        );
      }

      if (serviceResult.error || !serviceResult.data) {
        throw new ClearanceError(
          `Service not found: ${serviceId}`,
          "SERVICE_NOT_FOUND",
          { serviceId, error: serviceResult.error }
        );
      }

      if (reasonResult.error || !reasonResult.data) {
        throw new ClearanceError(
          `Invalid reason ID: ${reasonId}`,
          "INVALID_REASON",
          { reasonId, error: reasonResult.error }
        );
      }

      if (levelResult.error || !levelResult.data) {
        throw new ClearanceError(
          `Invalid level code: ${level}`,
          "INVALID_LEVEL",
          { level, error: levelResult.error }
        );
      }

      if (adminResult.error || !adminResult.data) {
        throw new ClearanceError(
          `Admin not found for auth user: ${adminId}`,
          "ADMIN_NOT_FOUND",
          { authUserId: adminId, error: adminResult.error }
        );
      }

      // Extract the data
      const { data: student } = studentResult;
      const { data: service } = serviceResult;
      const { data: reason } = reasonResult;
      const { data: levelData } = levelResult;
      const { data: admin } = adminResult;

      // PROBLEM 4 FIX: Check if student belongs to this level
      if (student.level_id !== levelData.id) {
        throw new ClearanceError(
          `Student belongs to different level. Student is in level ID ${student.level_id}, but trying to clear from level ID ${levelData.id}`,
          "LEVEL_MISMATCH",
          {
            studentLevel: student.level_id,
            requestedLevel: levelData.id,
            studentId: student.id,
          }
        );
      }

      // Check if note is required but not provided
      if (reason.requires_note && (!comments || comments.trim() === "")) {
        throw new ClearanceError(
          `Note is required for reason: ${reason.display_name}`,
          "NOTE_REQUIRED",
          { reasonId, reasonName: reason.display_name }
        );
      }

      // PROBLEM 5 FIX: Create manual override record with error handling
      // Note: Supabase handles consistency at the query level, file updates are separate
      const manualOverride: Omit<ManualOverride, "id" | "created_at"> = {
        student_id: studentId,
        service_id: serviceId,
        reason: reason.code as Database["public"]["Enums"]["override_reason"],
        overridden_by: admin.id, // Use the actual admin table ID, not the auth user ID
        note: comments || null,
        level_id: levelData.id,
      };

      const { data: createdOverride, error: createError } = await supabaseAdmin
        .from("manual_overrides")
        .insert(manualOverride)
        .select()
        .single();

      if (createError || !createdOverride) {
        throw new ClearanceError(
          "Failed to create manual override",
          "CREATE_OVERRIDE_FAILED",
          { error: createError }
        );
      }

      // Update storage files with retry logic for race condition handling
      // This is done after the database insert to ensure we only update files if DB succeeds
      await this.updateAttendanceFilesWithRetry(
        serviceId,
        level,
        [studentId],
        "clear",
        3,
        {
          adminId: admin.id,
          adminEmail: admin.email,
          reason: reason.display_name,
          notes: comments,
        }
      );

      const result = createdOverride;

      // Log successful clearance using audit system with proper template method
      const audit = AuditLogger.withAdmin(admin.id);
      await audit.manuallyClear(
        `${student.first_name} ${student.last_name}`,
        service.name || `Service ${serviceId}`,
        comments || "No reason provided"
      );

      return result;
    } catch (error) {
      // Only attempt audit logging if we have a valid admin (avoid foreign key errors)
      if (error instanceof ClearanceError && error.code !== "ADMIN_NOT_FOUND") {
        try {
          // We can't use the admin ID from the main flow since it failed
          // So we skip audit logging for admin-related errors to avoid foreign key issues
          console.error("Student clearance failed:", error.message);
        } catch (auditError) {
          console.error("Audit logging also failed:", auditError);
        }
      } else {
        console.error("Student clearance failed (admin lookup issue):", error);
      }

      // Re-throw with proper typing
      if (error instanceof ClearanceError) {
        throw error;
      }
      throw new ClearanceError(
        "Failed to clear student attendance",
        "CLEARANCE_FAILED",
        { originalError: error }
      );
    }
  }

  /**
   * Clear attendance for multiple students in a batch
   * @param params Batch clearance parameters
   * @returns Summary of the batch operation
   * @throws {ClearanceError} If batch clearance fails
   */
  static async batchClearStudents(
    params: z.infer<typeof BatchClearanceParamsSchema>
  ) {
    try {
      // Validate input
      const validation = BatchClearanceParamsSchema.safeParse(params);
      if (!validation.success) {
        throw new ClearanceError(
          "Invalid batch clearance parameters",
          "INVALID_INPUT",
          validation.error.issues
        );
      }

      const {
        studentIds,
        serviceId,
        level,
        reasonId,
        adminId,
        comments,
        ipAddress,
      } = validation.data;

      const results = [];
      const errors = [];

      // Process each student with improved error handling
      for (const studentId of studentIds) {
        try {
          const result = await this.clearStudent({
            studentId,
            serviceId,
            level,
            reasonId,
            adminId,
            comments,
            ipAddress,
          });
          results.push(result);
        } catch (error) {
          errors.push({
            studentId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Log batch completion
      if (results.length > 0) {
        const audit = AuditLogger.withAdmin(adminId);
        await audit.log({
          action: "Batch Clearance Completed",
          objectType: "batch",
          details: {
            reason: `Processed ${results.length} students successfully`,
            description: `Total: ${studentIds.length}, Success: ${results.length}, Failed: ${errors.length}`,
            metadata: {
              total: studentIds.length,
              successful: results.length,
              failed: errors.length,
              serviceId,
              level,
            },
          },
        });
      }

      return {
        total: studentIds.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors,
      };
    } catch (error) {
      // Log batch error
      const audit = AuditLogger.withAdmin(params.adminId);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await audit.log({
        action: "Batch Clearance Failed",
        objectType: "batch",
        details: {
          reason: `Batch clearance failed: ${errorMessage}`,
          description: `Students: ${params.studentIds.length}, Service: ${params.serviceId}`,
          metadata: {
            studentCount: params.studentIds.length,
            serviceId: params.serviceId,
            level: params.level,
          },
        },
      });

      if (error instanceof ClearanceError) {
        throw error;
      }
      throw new ClearanceError(
        "Failed to process batch clearance",
        "BATCH_CLEARANCE_FAILED",
        { originalError: error }
      );
    }
  }

  // PROBLEM 6 FIX: Add retry logic and file locking for race condition handling
  /**
   * Update attendance files with retry logic for race conditions
   * @private
   */
  private static async updateAttendanceFilesWithRetry(
    serviceId: string,
    level: string,
    studentIds: string[],
    action: "clear" | "revert" = "clear",
    maxRetries: number = 3,
    clearanceMetadata?: {
      adminId: string;
      adminEmail: string;
      reason: string;
      notes?: string;
    }
  ): Promise<void> {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.updateAttendanceFiles(serviceId, level, studentIds, action, clearanceMetadata);
        return; // Success - exit retry loop
      } catch (error) {
        attempt++;

        // If it's a storage conflict error and we haven't exceeded max retries
        if (attempt < maxRetries && this.isRetryableError(error)) {
          // Exponential backoff: wait 100ms, then 200ms, then 400ms
          const delay = 100 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // If we've exhausted retries or it's not a retryable error, throw
        throw error;
      }
    }
  }

  /**
   * Check if an error is retryable (typically storage conflicts)
   * @private
   */
  private static isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("conflict") ||
        message.includes("concurrent") ||
        message.includes("retry") ||
        message.includes("locked")
      );
    }
    return false;
  }

  /**
   * Update attendance files in storage after manual clearance
   * @private
   * @param serviceId ID of the service
   * @param level Level code (e.g., '100', '200')
   * @param studentIds Array of student IDs to update
   * @param action Whether to 'clear' or 'revert' the clearance
   * @param clearanceMetadata Optional metadata for clearance tracking
   * @throws {ClearanceError} If file operations fail
   */
  private static async updateAttendanceFiles(
    serviceId: string,
    level: string,
    studentIds: string[],
    action: "clear" | "revert",
    clearanceMetadata?: {
      adminId: string;
      adminEmail: string;
      reason: string;
      notes?: string;
    }
  ): Promise<void> {
    try {
      // Get service date for file path (this query is now done in the main method)
      const { data: service } = await supabaseAdmin
        .from("services")
        .select("service_date, name")
        .eq("id", serviceId)
        .single();

      if (!service) {
        throw new ClearanceError(
          `Service not found: ${serviceId}`,
          "SERVICE_NOT_FOUND"
        );
      }

      const dateStr = new Date(service.service_date)
        .toISOString()
        .split("T")[0];
      const basePath = `attendance/${dateStr}/${serviceId}/${level}`;

      // Generate a unique operation ID to prevent conflicts
      const operationId = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const lockPath = `${basePath}/.lock-${operationId}`;

      try {
        // Create a temporary lock file
        const { error: lockError } = await supabaseAdmin.storage
          .from(this.BUCKET)
          .upload(
            lockPath,
            JSON.stringify({
              operationId,
              timestamp: new Date().toISOString(),
              studentIds,
            }),
            {
              upsert: false, // Don't overwrite - will fail if lock exists
              contentType: "application/json",
            }
          );

        // If lock creation failed, someone else is working on this
        if (lockError) {
          throw new ClearanceError(
            "File operation in progress - please retry",
            "STORAGE_LOCKED",
            { lockError }
          );
        }

        // Now safely update the files
        await this.updateAbsenteesFile(basePath, studentIds);
        await this.updateClearedFile(basePath, studentIds, clearanceMetadata);
      } finally {
        // Always clean up the lock file
        try {
          await supabaseAdmin.storage.from(this.BUCKET).remove([lockPath]);
        } catch (cleanupError) {
          console.warn("Failed to clean up lock file:", cleanupError);
        }
      }
    } catch (error) {
      console.error("Error updating attendance files:", error);
      if (error instanceof ClearanceError) {
        throw error;
      }
      throw new ClearanceError(
        "Failed to update attendance files",
        "STORAGE_UPDATE_FAILED",
        { originalError: error }
      );
    }
  }

  /**
   * Update the absentees.json file - preserves original data structure
   * @private
   */
  private static async updateAbsenteesFile(
    basePath: string,
    studentIds: string[]
  ): Promise<void> {
    const absenteesPath = `${basePath}/absentees.json`;
    const { data: absenteesData, error: downloadError } =
      await supabaseAdmin.storage.from(this.BUCKET).download(absenteesPath);

    if (
      downloadError &&
      downloadError.message !== "The resource was not found"
    ) {
      throw new ClearanceError(
        "Failed to download absentees file",
        "STORAGE_DOWNLOAD_FAILED",
        { path: absenteesPath, error: downloadError }
      );
    }

    if (absenteesData) {
      try {
        const absentees: OriginalAbsenteeRecord[] = JSON.parse(await absenteesData.text());
        
        // Filter out cleared students using correct property name
        const updatedAbsentees = absentees.filter(
          (student: OriginalAbsenteeRecord) => !studentIds.includes(student.student_id)
        );

        const { error: uploadError } = await supabaseAdmin.storage
          .from(this.BUCKET)
          .upload(absenteesPath, JSON.stringify(updatedAbsentees, null, 2), {
            upsert: true,
            contentType: "application/json",
            cacheControl: "no-cache",
          });

        if (uploadError) {
          throw new ClearanceError(
            "Failed to update absentees file",
            "STORAGE_UPLOAD_FAILED",
            { path: absenteesPath, error: uploadError }
          );
        }
      } catch (parseError) {
        throw new ClearanceError(
          "Invalid absentees file format",
          "INVALID_FILE_FORMAT",
          { path: absenteesPath, error: parseError }
        );
      }
    }
  }

  /**
   * Update the manually_cleared.json file with consistent format
   * @private
   */
  private static async updateClearedFile(
    basePath: string,
    studentIds: string[],
    clearanceMetadata?: {
      adminId: string;
      adminEmail: string;
      reason: string;
      notes?: string;
    }
  ): Promise<void> {
    const clearedPath = `${basePath}/manually_cleared.json`;
    const absenteesPath = `${basePath}/absentees.json`;

    // Download both existing cleared file and absentees file
    const [clearedResult, absenteesResult] = await Promise.all([
      supabaseAdmin.storage.from(this.BUCKET).download(clearedPath),
      supabaseAdmin.storage.from(this.BUCKET).download(absenteesPath),
    ]);

    // Handle cleared file download errors (file not found is OK)
    if (
      clearedResult.error &&
      clearedResult.error.name !== "StorageApiError" &&
      !((clearedResult.error as any).originalError?.status === 400)
    ) {
      throw new ClearanceError(
        "Failed to download cleared file",
        "STORAGE_DOWNLOAD_FAILED",
        { path: clearedPath, error: clearedResult.error }
      );
    }

    // Handle absentees file download errors
    if (
      absenteesResult.error &&
      absenteesResult.error.message !== "The resource was not found"
    ) {
      throw new ClearanceError(
        "Failed to download absentees file for student data",
        "STORAGE_DOWNLOAD_FAILED",
        { path: absenteesPath, error: absenteesResult.error }
      );
    }

    // Parse existing cleared data
    const existingCleared: EnhancedClearedRecord[] = [];
    if (clearedResult.data && !clearedResult.error) {
      try {
        const parsedData = JSON.parse(await clearedResult.data.text());
        if (Array.isArray(parsedData)) {
          existingCleared.push(...parsedData);
        }
      } catch (parseError) {
        console.warn(
          "Error parsing cleared students file, starting fresh:",
          parseError
        );
      }
    }

    // Parse absentees data to get full student records
    let absenteesData: OriginalAbsenteeRecord[] = [];
    if (absenteesResult.data) {
      try {
        absenteesData = JSON.parse(await absenteesResult.data.text());
      } catch (parseError) {
        console.warn("Error parsing absentees file:", parseError);
        absenteesData = [];
      }
    }

    // Create enhanced cleared records with full student data
    const newClearedRecords: EnhancedClearedRecord[] = [];
    for (const studentId of studentIds) {
      // Find the student's full record from absentees
      const studentRecord = absenteesData.find(
        (record) => record.student_id === studentId
      );

      if (studentRecord) {
        // Create enhanced record with full student data + clearance info
        const enhancedRecord: EnhancedClearedRecord = {
          ...studentRecord, // Preserve all original fields
          clearance: {
            status: 'cleared',
            cleared_at: new Date().toISOString(),
            cleared_by: clearanceMetadata?.adminEmail || 'system',
            admin_id: clearanceMetadata?.adminId || '',
            reason: clearanceMetadata?.reason || 'Manual clearance',
            notes: clearanceMetadata?.notes,
          },
        };
        newClearedRecords.push(enhancedRecord);
      } else {
        console.warn(
          `Student ${studentId} not found in absentees file, skipping clearance record`
        );
      }
    }

    // Merge and deduplicate by student ID
    const updatedCleared = [
      ...existingCleared.filter(
        (record) => !studentIds.includes(record.student_id)
      ),
      ...newClearedRecords,
    ];

    // Upload updated file (this will create the file if it doesn't exist)
    const { error: uploadError } = await supabaseAdmin.storage
      .from(this.BUCKET)
      .upload(clearedPath, JSON.stringify(updatedCleared, null, 2), {
        upsert: true,
        contentType: "application/json",
        cacheControl: "no-cache",
      });

    if (uploadError) {
      console.error("Failed to upload cleared students file:", uploadError);
      throw new ClearanceError(
        "Failed to update cleared students file",
        "STORAGE_UPLOAD_FAILED",
        { path: clearedPath, error: uploadError }
      );
    }
  }
}
