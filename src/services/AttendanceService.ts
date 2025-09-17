import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import Papa from "papaparse";
import { AuditLogger, ActionTemplates } from "@/lib/audit";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types for the attendance service
export interface AttendanceUploadResult {
  uploadId: string;
  batchId: string;
  recordsProcessed: number;
  matchedCount: number;
  unmatchedCount: number;
  issues: AttendanceIssue[];
  storagePaths: {
    rawPath: string;
    attendeesPath: string;
    absenteesPath: string;
    issuesPath: string;
    exemptedPath?: string | null;
  };
}

export interface AttendancePreview {
  matched: Array<{
    student_id: string;
    matric_number: string;
    student_name: string;
  }>;
  unmatched: Array<{
    raw_data: any;
    reason: string;
  }>;
  summary: {
    total_records: number;
    matched_count: number;
    unmatched_count: number;
  };
}

export interface AttendanceIssue {
  type: string;
  description: string;
  raw_data: any;
  reason: string;
}

export interface StorageUploadOptions {
  serviceId: string;
  levelId: string;
  file: File;
  uploadedBy: string;
}

export interface ProcessedAttendanceData {
  attendees: any[];
  absentees: any[];
  exempted: any[];
  unmatched: any[];
  issues: AttendanceIssue[];
}

export class AttendanceService {
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.SUPABASE_ATTENDANCE_BUCKET || "attendance-scans";
  }

  /**
   * Upload attendance file to Supabase Storage with level-separated structure
   */
  async uploadAttendanceFile(options: StorageUploadOptions): Promise<{
    uploadId: string;
    storagePath: string;
    fileHash: string;
  }> {
    const { serviceId, levelId, file, uploadedBy } = options;

    // Generate file hash for deduplication
    const fileBuffer = await file.arrayBuffer();
    const fileHash = await this.generateFileHash(fileBuffer);

    // Check for existing upload with same hash
    const { data: existingUpload } = await supabaseAdmin
      .from("attendance_uploads")
      .select("id, storage_path")
      .eq("service_id", serviceId)
      .eq("level_id", levelId)
      .eq("file_hash", fileHash)
      .maybeSingle();

    if (existingUpload) {
      return {
        uploadId: existingUpload.id,
        storagePath: existingUpload.storage_path,
        fileHash,
      };
    }

    // Get service and level information for structured path
    const [serviceData, levelData] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("service_date, name")
        .eq("id", serviceId)
        .single(),
      supabaseAdmin.from("levels").select("code").eq("id", levelId).single(),
    ]);

    if (!serviceData.data || !levelData.data) {
      throw new Error("Service or level not found");
    }

    // Create level-separated storage structure: /attendance/{date}/{serviceId}/{level}/
    const serviceDate = serviceData.data.service_date;
    const levelCode = levelData.data.code;
    const timestamp = new Date().getTime();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `attendance/${serviceDate}/${serviceId}/${levelCode}/${timestamp}-${safeName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(this.bucket)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "text/csv",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Create upload record with corrected schema
    const insertData: Database["public"]["Tables"]["attendance_uploads"]["Insert"] =
      {
        service_id: serviceId,
        level_id: levelId,
        storage_path: storagePath,
        file_hash: fileHash,
        uploaded_by: uploadedBy,
        uploaded_at: new Date().toISOString(),
      };

    const { data: uploadRecord, error: insertError } = await supabaseAdmin
      .from("attendance_uploads")
      .insert(insertData)
      .select("id")
      .single();

    if (insertError || !uploadRecord) {
      throw new Error(
        `Failed to create upload record: ${insertError?.message}`
      );
    }

    return {
      uploadId: uploadRecord.id,
      storagePath,
      fileHash,
    };
  }

  /**
   * Process uploaded attendance file and generate preview
   */
  async processAttendanceFile(uploadId: string): Promise<AttendancePreview> {
    // Get upload record
    const { data: upload, error: uploadError } = await supabaseAdmin
      .from("attendance_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (uploadError || !upload) {
      throw new Error(`Upload record not found: ${uploadError?.message}`);
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(this.bucket)
      .download(upload.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Parse CSV data
    const fileText = await fileData.text();
    const parseResult = Papa.parse(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing failed: ${parseResult.errors[0].message}`);
    }

    // Process and match students
    const processedData = await this.matchStudentsFromCSV(
      parseResult.data,
      upload.service_id,
      upload.level_id
    );

    return {
      matched: processedData.attendees,
      unmatched: processedData.unmatched,
      summary: {
        total_records: parseResult.data.length,
        matched_count: processedData.attendees.length,
        unmatched_count: processedData.unmatched.length,
      },
    };
  }

  /**
   * Preview attendance file - parse and return only unmatched records for user review
   */
  async previewAttendanceFile(uploadId: string): Promise<{
    summary: {
      total_records: number;
      matched_count: number;
      unmatched_count: number;
    };
    issues: Array<{
      unique_id: string;
      level: number;
      reason: string;
      raw_data: any;
    }>;
  }> {
    // Get upload record
    const { data: upload, error: uploadError } = await supabaseAdmin
      .from("attendance_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (uploadError || !upload) {
      throw new Error(`Upload record not found: ${uploadError?.message}`);
    }

    // Download and parse CSV
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(this.bucket)
      .download(upload.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    const fileText = await fileData.text();
    const parseResult = Papa.parse(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing failed: ${parseResult.errors[0].message}`);
    }

    // Process and match students
    const processedData = await this.matchStudentsFromCSV(
      parseResult.data,
      upload.service_id,
      upload.level_id
    );

    return {
      summary: {
        total_records: parseResult.data.length,
        matched_count: processedData.attendees.length,
        unmatched_count: processedData.unmatched.length,
      },
      issues: processedData.unmatched,
    };
  }

  /**
   * Confirm attendance upload and create batch record with corrected workflow (no absentees)
   */
  async confirmAttendanceUpload(
    uploadId: string,
    confirmedBy: string
  ): Promise<AttendanceUploadResult> {
    // Get upload record
    const { data: upload, error: uploadError } = await supabaseAdmin
      .from("attendance_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (uploadError || !upload) {
      throw new Error(`Upload record not found: ${uploadError?.message}`);
    }

    // Process the file data
    const processedData = await this.matchStudentsFromCSV(
      await this.parseCSVFromUpload(uploadId),
      upload.service_id,
      upload.level_id
    );

    // Calculate absentees (students in level but not in attendees)
    const attendeeIds = processedData.attendees.map((a) => a.student_id);
    const absentees = await this.calculateAbsentees(
      upload.service_id,
      upload.level_id,
      attendeeIds
    );

    // Create storage paths
    const basePath = upload.storage_path.replace(/\/[^\/]+$/, "");
    const storagePaths = {
      rawPath: upload.storage_path,
      attendeesPath: `${basePath}/attendees.json`,
      absenteesPath: `${basePath}/absentees.json`,
      exemptedPath: `${basePath}/exempted.json`,
      issuesPath: `${basePath}/issues.json`,
    };

    // Store processed data including absentees and exempted students
    await Promise.all([
      this.storeJSONInStorage(
        storagePaths.attendeesPath,
        processedData.attendees
      ),
      this.storeJSONInStorage(storagePaths.absenteesPath, absentees.absentees),
      this.storeJSONInStorage(storagePaths.exemptedPath, absentees.exempted),
      this.storeJSONInStorage(
        storagePaths.issuesPath,
        processedData.issues || []
      ),
    ]);

    // Create attendance batch record
    const { data: batch, error: batchError } = await supabaseAdmin
      .from("attendance_batches")
      .insert({
        attendance_upload_id: uploadId,
        attendees_path: storagePaths.attendeesPath,
        absentees_path: storagePaths.absenteesPath,
        exempted_path: storagePaths.exemptedPath,
        issues_path: storagePaths.issuesPath,
        raw_path: upload.storage_path,
        version_number: 1,
      })
      .select()
      .single();

    if (batchError || !batch) {
      throw new Error(`Failed to create batch: ${batchError?.message}`);
    }

    // Update attendance upload status
    // Note: attendance_uploads table doesn't have processed_at or count fields
    // We'll just mark it as processed by updating the uploaded_at timestamp
    const { error: attendanceError } = await supabaseAdmin
      .from("attendance_uploads")
      .update({
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", uploadId);

    if (attendanceError) {
      console.error(
        "Failed to update attendance upload status:",
        "Failed to create attendance records:",
        attendanceError.message
      );
    }

    // Create issues for unmatched records
    const issues = await this.createIssuesFromUnmatched(
      batch.id,
      processedData.unmatched,
      confirmedBy
    );

    // Lock service after successful ingestion
    await supabaseAdmin
      .from("services")
      .update({ locked_after_ingestion: true })
      .eq("id", upload.service_id);

    // Get service name for logging
    const { data: serviceData } = await supabaseAdmin
      .from("services")
      .select("name, service_type, devotion_type")
      .eq("id", upload.service_id)
      .single();

    const serviceName =
      serviceData?.name ||
      (serviceData?.service_type === "devotion"
        ? `${serviceData.devotion_type} Devotion`
        : "Service");

    // Log admin action using existing audit system
    const audit = AuditLogger.withAdmin(confirmedBy, "System");
    await audit.log(
      ActionTemplates.confirmAttendanceUpload(
        serviceName,
        processedData.attendees.length
      )
    );

    return {
      uploadId,
      batchId: batch.id,
      recordsProcessed:
        processedData.attendees.length +
        processedData.unmatched?.length +
        (absentees?.absentees?.length || 0) +
        (absentees?.exempted?.length || 0),
      matchedCount: processedData.attendees.length,
      unmatchedCount: processedData.unmatched?.length || 0,
      issues,
      storagePaths: {
        rawPath: storagePaths.rawPath,
        attendeesPath: storagePaths.attendeesPath,
        absenteesPath: storagePaths.absenteesPath,
        exemptedPath: storagePaths.exemptedPath,
        issuesPath: storagePaths.issuesPath,
      },
    };
  }

  /**
   * Cancel attendance upload
   */
  async cancelAttendanceUpload(
    uploadId: string,
    cancelledBy: string
  ): Promise<void> {
    // Get upload record for logging
    const { data: upload } = await supabaseAdmin
      .from("attendance_uploads")
      .select("service_id, level_id")
      .eq("id", uploadId)
      .single();

    if (!upload) {
      throw new Error("Upload record not found");
    }

    // First, delete any dependent attendance_batches records
    const { error: batchError } = await supabaseAdmin
      .from("attendance_batches")
      .delete()
      .eq("attendance_upload_id", uploadId);

    if (batchError) {
      console.error("Error deleting attendance batches:", batchError);
      // Continue with upload deletion even if batch deletion fails
    }

    // Then delete the upload record
    const { error } = await supabaseAdmin
      .from("attendance_uploads")
      .delete()
      .eq("id", uploadId);

    if (error) {
      throw new Error(`Failed to cancel upload: ${error.message}`);
    }

    // Get service name for logging
    const { data: serviceData } = await supabaseAdmin
      .from("services")
      .select("name, service_type, devotion_type")
      .eq("id", upload.service_id)
      .single();

    const serviceName =
      serviceData?.name ||
      (serviceData?.service_type === "devotion"
        ? `${serviceData.devotion_type} Devotion`
        : "Service");

    // Log admin action using existing audit system
    const audit = AuditLogger.withAdmin(cancelledBy, "System");
    await audit.log(
      ActionTemplates.cancelAttendanceUpload(
        serviceName,
        "User cancelled upload"
      )
    );
  }

  /**
   * Get attendance data by service and level
   */
  async getAttendanceByService(
    serviceId: string,
    levelId?: string
  ): Promise<{
    attendees: any[];
    absentees: any[];
    exempted: any[];
    summary: {
      total_students: number;
      total_present: number;
      total_absent: number;
      total_exempted: number;
      attendance_rate: number;
    };
  }> {
    let query = supabaseAdmin
      .from("attendance_batches")
      .select(
        `
        *,
        attendance_uploads!inner(
          service_id,
          level_id,
          uploaded_at
        )
      `
      )
      .eq("attendance_uploads.service_id", serviceId);

    if (levelId) {
      query = query.eq("attendance_uploads.level_id", levelId);
    }

    const { data: batches, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch attendance data: ${error.message}`);
    }

    if (!batches || batches.length === 0) {
      return {
        attendees: [],
        absentees: [],
        exempted: [],
        summary: {
          total_students: 0,
          total_present: 0,
          total_absent: 0,
          total_exempted: 0,
          attendance_rate: 0,
        },
      };
    }

    // Get the most recent batch
    const latestBatch = batches[0];

    // Load attendees and absentees from storage
    const [attendeesData, absenteesData, exemptedData] = await Promise.all([
      this.loadJSONFromStorage(latestBatch.attendees_path),
      this.loadJSONFromStorage(latestBatch.absentees_path),
      latestBatch.exempted_path
        ? this.loadJSONFromStorage(latestBatch.exempted_path)
        : Promise.resolve([]), // ✅ Handle null case
    ]);

    const totalPresent = attendeesData.length;
    const totalAbsent = absenteesData.length;
    const totalExempted = exemptedData.length;
    const totalStudents = totalPresent + totalAbsent + totalExempted;
    const attendanceRate =
      totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;

    return {
      attendees: attendeesData,
      absentees: absenteesData,
      exempted: exemptedData,
      summary: {
        total_students: totalStudents,
        total_present: totalPresent,
        total_absent: totalAbsent,
        total_exempted: totalExempted,
        attendance_rate: Math.round(attendanceRate * 100) / 100,
      },
    };
  }

  /**
   * Export attendance data in specified format
   */
  async exportAttendanceData(
    serviceId: string,
    levelId: string,
    format: "csv" | "xlsx"
  ): Promise<Blob> {
    const attendanceData = await this.getAttendanceByService(
      serviceId,
      levelId
    );

    if (format === "csv") {
      return this.exportToCSV(attendanceData);
    } else {
      return this.exportToXLSX(attendanceData);
    }
  }

  // Private helper methods

  private async generateFileHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async matchStudentsFromCSV(
    csvData: any[],
    serviceId: string,
    levelId: string
  ): Promise<ProcessedAttendanceData> {
    // Get students for the level with level information
    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select(
        `
        id, 
        matric_number, 
        first_name, 
        last_name, 
        gender,
        level_id,
        levels!inner(code)
      `
      )
      .eq("level_id", levelId)
      .eq("status", "active");

    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`);
    }

    // Get level code for validation
    const { data: levelData } = await supabaseAdmin
      .from("levels")
      .select("code")
      .eq("id", levelId)
      .single();

    const expectedLevelCode = levelData?.code;
    const studentMap = new Map(
      students?.map((s) => [s.matric_number.toLowerCase(), s]) || []
    );

    const attendees: any[] = [];
    const unmatched: any[] = [];

    for (const row of csvData) {
      // Extract UniqueID and Level from CSV
      const uniqueId = (row.uniqueid || row.UniqueID || "").toString().trim();
      const csvLevel = parseInt(row.level || row.Level || "0");

      if (!uniqueId) {
        unmatched.push({
          unique_id: uniqueId,
          level: csvLevel,
          reason: "Missing UniqueID in CSV",
          raw_data: row,
        });
        continue;
      }

      const cleanMatric = uniqueId.toLowerCase();
      const student = studentMap.get(cleanMatric);

      if (!student) {
        unmatched.push({
          unique_id: uniqueId,
          level: csvLevel,
          reason: "Student not found in database",
          raw_data: row,
        });
        continue;
      }

      // Validate level matches
      const studentLevelCode = (student.levels as any)?.code;

      // Convert both to numbers for comparison
      const csvLevelNum = parseInt(csvLevel.toString());
      const studentLevelNum = parseInt(studentLevelCode?.toString() || "0");

      if (csvLevelNum !== studentLevelNum) {
        unmatched.push({
          unique_id: uniqueId,
          level: csvLevel,
          reason: `Level mismatch - student is ${studentLevelCode}L but CSV shows ${csvLevel}L`,
          raw_data: row,
        });
        continue;
      }

      // Successfully matched - include unique_id, level, and gender from student record
      attendees.push({
        unique_id: uniqueId,
        level: studentLevelCode,
        gender: student.gender,
        student_id: student.id,
        matric_number: student.matric_number,
        student_name: `${student.first_name} ${student.last_name}`,
      });
    }

    return {
      attendees,
      absentees: [], // Will be populated later
      exempted: [], // Will be populated later
      unmatched,
      issues: [],
    };
  }

  private async storeProcessedDataInStorage(
    paths: {
      rawPath: string;
      attendeesPath: string;
      absenteesPath: string;
      issuesPath: string;
      exemptedPath?: string | null;
    },
    data: ProcessedAttendanceData
  ): Promise<void> {
    // Store all required files
    await Promise.all([
      this.storeJSONInStorage(paths.attendeesPath, data.attendees),
      this.storeJSONInStorage(paths.absenteesPath, data.absentees),
      this.storeJSONInStorage(paths.issuesPath, data.unmatched),
    ]);

    // Store exempted file only if path is provided
    if (paths.exemptedPath) {
      await this.storeJSONInStorage(paths.exemptedPath, data.exempted);
    }
  }

  private async storeJSONInStorage(path: string, data: any): Promise<void> {
    const jsonData = JSON.stringify(data, null, 2);
    const { error } = await supabaseAdmin.storage
      .from(this.bucket)
      .upload(path, jsonData, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to store JSON at ${path}: ${error.message}`);
    }
  }

  private async loadJSONFromStorage(path: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin.storage
      .from(this.bucket)
      .download(path);

    if (error) {
      console.warn(`Failed to load JSON from ${path}: ${error.message}`);
      return [];
    }

    try {
      const text = await data.text();
      return JSON.parse(text);
    } catch (parseError) {
      console.warn(`Failed to parse JSON from ${path}:`, parseError);
      return [];
    }
  }

  private async createIssuesFromUnmatched(
    batchId: string,
    unmatched: any[],
    raisedBy: string
  ): Promise<AttendanceIssue[]> {
    if (unmatched.length === 0) return [];

    const issues = unmatched.map((item) => ({
      attendance_batch_id: batchId,
      issue_description: item.reason,
      issue_type: "unmatched_student",
      raw_data: item.raw_data,
      resolved: false,
    }));

    const { error } = await supabaseAdmin
      .from("attendance_issues")
      .insert(issues);

    if (error) {
      console.error("Failed to create issues:", error.message);
    }

    return unmatched.map((item) => ({
      type: "unmatched_student",
      description: item.reason,
      raw_data: item.raw_data,
      reason: item.reason,
    }));
  }

  private async calculateAbsentees(
    serviceId: string,
    levelId: string,
    attendeeIds: string[]
  ): Promise<{ absentees: any[]; exempted: any[] }> {
    // Get service date for exeat validation
    const { data: serviceData, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("service_date")
      .eq("id", serviceId)
      .single();

    if (serviceError) {
      throw new Error(`Failed to fetch service date: ${serviceError.message}`);
    }

    const serviceDate = serviceData.service_date;

    // Get all active students for the level with their gender and level info
    const { data: allStudents, error } = await supabaseAdmin
      .from("students")
      .select(
        `
        id, 
        matric_number, 
        first_name, 
        last_name,
        gender,
        level_id,
        levels(code)
      `
      )
      .eq("level_id", levelId)
      .eq("status", "active");

    if (error) {
      throw new Error(`Failed to fetch level students: ${error.message}`);
    }

    // Get students with active exeats that cover the service date
    const { data: studentsWithExeats, error: exeatError } = await supabaseAdmin
      .from("exeats")
      .select("student_id")
      .eq("status", "active")
      .lte("start_date", serviceDate)
      .gte("end_date", serviceDate);

    if (exeatError) {
      console.warn(`Failed to fetch exeats: ${exeatError.message}`);
      // Continue without exeat filtering if query fails
    }

    // Create set of student IDs with valid exeats
    const exemptedStudentIds = new Set(
      studentsWithExeats?.map((exeat) => exeat.student_id) || []
    );

    // Get exempted students with their details
    const exemptedStudents = (allStudents || [])
      .filter(
        (student) =>
          !attendeeIds.includes(student.id) &&
          exemptedStudentIds.has(student.id)
      )
      .map((student) => ({
        student_id: student.id,
        matric_number: student.matric_number,
        student_name: `${student.first_name} ${student.last_name}`,
        gender: student.gender,
        level: student.levels?.code || null,
        level_id: student.level_id,
        status: "exempted",
        reason: "Active exeat",
      }));

    // Get absent students (not present and not exempted)
    const absentees = (allStudents || [])
      .filter(
        (student) =>
          !attendeeIds.includes(student.id) &&
          !exemptedStudentIds.has(student.id)
      )
      .map((student) => ({
        student_id: student.id,
        matric_number: student.matric_number,
        student_name: `${student.first_name} ${student.last_name}`,
        gender: student.gender,
        level: student.levels?.code || null,
        level_id: student.level_id,
      }));

    return { absentees, exempted: exemptedStudents };
  }

  private async exportToCSV(data: any): Promise<Blob> {
    // Implementation for CSV export
    const csvContent = Papa.unparse(data.attendees);
    return new Blob([csvContent], { type: "text/csv" });
  }

  private async exportToXLSX(data: any): Promise<Blob> {
    // Implementation for XLSX export (would need xlsx library)
    throw new Error("XLSX export not implemented yet");
  }

  private async parseCSVFromUpload(uploadId: string): Promise<any[]> {
    const { data: upload } = await supabaseAdmin
      .from("attendance_uploads")
      .select("storage_path")
      .eq("id", uploadId)
      .single();

    if (!upload) throw new Error("Upload not found");

    const { data: fileData } = await supabaseAdmin.storage
      .from(this.bucket)
      .download(upload.storage_path);

    if (!fileData) throw new Error("Failed to download file");

    const fileText = await fileData.text();
    const parseResult = Papa.parse(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    return parseResult.data;
  }
}
