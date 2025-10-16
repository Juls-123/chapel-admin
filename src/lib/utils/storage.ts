// src/lib/utils/storage.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "attendance-scans";

export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Generate storage path for attendance files
 */
export function generateAttendancePath(
  date: string,
  serviceId: string,
  level: string,
  filename: string
): string {
  return `attendance/${date}/${serviceId}/${level}/${filename}`;
}

/**
 * Download and parse JSON file from storage
 * Returns null if file doesn't exist (silent skip)
 */
export async function downloadJsonFile<T = any>(
  path: string
): Promise<T | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(path);

    // File not found - return null for silent skip
    if (error) {
      // Supabase returns StorageUnknownError with empty message for missing files
      const isNotFound = 
        error.name === 'StorageUnknownError' ||
        error.message === '{}' ||
        error.message === '' ||
        (error.message || '').toLowerCase().includes('not found') ||
        (error.message || '').toLowerCase().includes('does not exist');
      
      if (isNotFound) {
        // Silent skip for missing files
        return null;
      }

      // Other errors should be thrown
      console.error(`Unexpected storage error for ${path}:`, error);
      throw new StorageError(
        `Failed to download file: ${path}`,
        "DOWNLOAD_FAILED",
        { path, error }
      );
    }

    if (!data) {
      return null;
    }

    const text = await data.text();
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }

    // JSON parse errors
    if (error instanceof SyntaxError) {
      throw new StorageError(
        `Invalid JSON format: ${path}`,
        "INVALID_JSON",
        { path, error }
      );
    }

    throw new StorageError(
      `Storage operation failed: ${path}`,
      "STORAGE_ERROR",
      { path, error }
    );
  }
}

/**
 * Check if a file exists in storage
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(path.substring(0, path.lastIndexOf("/")), {
        search: path.substring(path.lastIndexOf("/") + 1),
      });

    return !error && data && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Download multiple JSON files in parallel
 */
export async function downloadMultipleJsonFiles<T = any>(
  paths: string[]
): Promise<Array<{ path: string; data: T | null }>> {
  const downloads = paths.map(async (path) => ({
    path,
    data: await downloadJsonFile<T>(path),
  }));

  return Promise.all(downloads);
}