import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import crypto from "crypto";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UploadResult {
  id: string;
  storagePath: string;
  fileHash: string;
}

export class StudentUploadService {
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.NEXT_PUBLIC_STUDENTS_UPLOADS_BUCKET || "students-uploads";
  }

  /**
   * Process and upload a student data file
   */
  async uploadStudentFile(file: File, adminId: string): Promise<UploadResult> {
    // Convert file to buffer
    const buffer = await this.fileToBuffer(file);
    
    // Generate file hash
    const fileHash = this.generateFileHash(buffer);
    
    // Create storage path
    const storagePath = this.createStoragePath(file, adminId);
    
    // Upload to storage
    await this.uploadToStorage(storagePath, buffer);
    
    // Create upload record
    const uploadId = await this.createUploadRecord({
      storagePath,
      fileHash,
      uploadedBy: adminId,
      fileSize: file.size,
      mimeType: file.type
    });

    return {
      id: uploadId,
      storagePath,
      fileHash
    };
  }

  private async fileToBuffer(file: File): Promise<Buffer> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("Error converting file to buffer:", error);
      throw new Error(`Failed to process file: ${error}`);
    }
  }

  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  private createStoragePath(file: File, adminId: string): string {
    const timestamp = Date.now();
    const safeName = (file.name || "students.xlsx").replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${adminId}/${timestamp}-${safeName}`;
  }

  private async uploadToStorage(path: string, buffer: Buffer): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(this.bucket)
      .upload(path, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false
      });

    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  private async createUploadRecord(data: {
    storagePath: string;
    fileHash: string;
    uploadedBy: string;
    fileSize: number;
    mimeType: string;
  }): Promise<string> {
    const { data: upload, error } = await supabaseAdmin
      .from("student_uploads")
      .insert({
        storage_path: data.storagePath,
        file_hash: data.fileHash,
        uploaded_by: data.uploadedBy,
        // Note: file_size and mime_type columns don't exist in the database
        // Consider adding them to the database schema if needed
      })
      .select("id")
      .single();

    if (error) {
      console.error("Database insert error:", error);
      throw new Error(`Failed to create upload record: ${error.message}`);
    }

    return upload.id;
  }
}
