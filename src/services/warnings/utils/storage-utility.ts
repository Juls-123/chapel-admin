// src/lib/utils/warning-letters/storage-utility.ts

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WARNINGS_BUCKET = "warnings"; // New dedicated bucket

export class WarningStorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "WarningStorageError";
  }
}

/**
 * Service metadata structure
 */
export interface ServiceInfo {
  service_id: string;
  service_name: string;
  service_date: string;
  service_time: string;
  service_type: string;
  levels: string[];
}

/**
 * Warning record structure (in WarningList.json)
 */
export interface WarningRecord {
  student_id: string;
  matric_number: string;
  student_name: string;
  level: string;
  email?: string;
  parent_email?: string;
  services_missed: Array<{
    service_id: string;
    service_name: string;
    service_date: string;
    service_time: string;
  }>;
  miss_count: number;
  status: 'not_sent' | 'sent' | 'failed' | 'exported';
}

/**
 * Warning list JSON structure
 */
export interface WarningListJSON {
  generated_at: string;
  workflow_id: string;
  mode: 'single' | 'batch' | 'weekly';
  date_range: {
    start: string;
    end: string;
  };
  summary: {
    total_students: number;
    by_level: Record<string, number>;
    average_miss_count: number;
    max_miss_count: number;
  };
  warnings: WarningRecord[];
}

/**
 * Meta report JSON structure
 */
export interface MetaReportJSON {
  warningsGenerated: number | undefined;
  warningsSent: number | undefined;
  warningsExported: number | undefined;
  errorDetails: unknown;
  workflow_id: string;
  mode: 'single' | 'batch' | 'weekly';
  status: 'draft' | 'locked' | 'completed' | 'failed';
  date_range: {
    start: string;
    end: string;
  };
  services_processed: ServiceInfo[];
  statistics: {
    total_services: number;
    total_students_scanned: number;
    total_absentees: number;
    warnings_generated: number;
    warnings_sent: number;
    warnings_failed: number;
    warnings_exported: number;
  };
  initiated_by: {
    admin_id: string;
    admin_name: string;
    admin_email: string;
  };
  timestamps: {
    created_at: string;
    locked_at?: string;
    completed_at?: string;
  };
  error_details?: unknown;
}

/**
 * Email delivery report JSON structure
 */
export interface EmailDeliveryReportJSON {
  workflow_id: string;
  delivery_summary: {
    total_attempted: number;
    successful: number;
    failed: number;
  };
  delivery_details: Array<{
    student_id: string;
    matric_number: string;
    email: string;
    status: 'sent' | 'failed';
    sent_at?: string;
    attempted_at?: string;
    message_id?: string;
    error?: string;
  }>;
}

/**
 * Generate Pascal case storage path
 * Format: YYYY/MM/DD/Mode/workflow-id
 */
export function generateStoragePath(
  workflowDate: Date,
  mode: 'single' | 'batch' | 'weekly',
  workflowId: string
): string {
  const year = workflowDate.getFullYear();
  const month = String(workflowDate.getMonth() + 1).padStart(2, '0');
  const day = String(workflowDate.getDate()).padStart(2, '0');
  
  // Capitalize first letter of mode
  const modeCapitalized = mode.charAt(0).toUpperCase() + mode.slice(1);
  
  return `${year}/${month}/${day}/${modeCapitalized}/${workflowId}`;
}

/**
 * Generate full file path for warning list
 */
export function generateWarningListPath(storagePath: string): string {
  return `${storagePath}/WarningList.json`;
}

/**
 * Generate full file path for meta report
 */
export function generateMetaReportPath(storagePath: string): string {
  return `${storagePath}/MetaReport.json`;
}

/**
 * Generate full file path for email delivery report
 */
export function generateEmailReportPath(storagePath: string): string {
  return `${storagePath}/EmailDeliveryReport.json`;
}

/**
 * Save JSON file to warnings bucket
 */
async function saveJSONFile(
  path: string,
  data: unknown
): Promise<void> {
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });

  const { error } = await supabaseAdmin.storage
    .from(WARNINGS_BUCKET)
    .upload(path, blob, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    throw new WarningStorageError(
      `Failed to save file: ${path}`,
      'SAVE_FAILED',
      { path, error }
    );
  }
}

/**
 * Load JSON file from warnings bucket
 */
async function loadJSONFile<T>(path: string): Promise<T | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(WARNINGS_BUCKET)
      .download(path);

    if (error) {
      const isNotFound = 
        error.name === 'StorageUnknownError' ||
        error.message === '{}' ||
        error.message === '' ||
        (error.message || '').toLowerCase().includes('not found');
      
      if (isNotFound) {
        return null;
      }

      throw new WarningStorageError(
        `Failed to load file: ${path}`,
        'LOAD_FAILED',
        { path, error }
      );
    }

    if (!data) {
      return null;
    }

    const text = await data.text();
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof WarningStorageError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new WarningStorageError(
        `Invalid JSON format: ${path}`,
        'INVALID_JSON',
        { path, error }
      );
    }

    throw new WarningStorageError(
      `Storage operation failed: ${path}`,
      'STORAGE_ERROR',
      { path, error }
    );
  }
}

/**
 * Save warning list to storage
 */
export async function saveWarningList(
  storagePath: string,
  warningList: WarningListJSON
): Promise<void> {
  const path = generateWarningListPath(storagePath);
  await saveJSONFile(path, warningList);
}

/**
 * Load warning list from storage
 */
export async function loadWarningList(
  storagePath: string
): Promise<WarningListJSON | null> {
  const path = generateWarningListPath(storagePath);
  return loadJSONFile<WarningListJSON>(path);
}

/**
 * Save meta report to storage
 */
export async function saveMetaReport(
  storagePath: string,
  metaReport: MetaReportJSON
): Promise<void> {
  const path = generateMetaReportPath(storagePath);
  await saveJSONFile(path, metaReport);
}

/**
 * Load meta report from storage
 */
export async function loadMetaReport(
  storagePath: string
): Promise<MetaReportJSON | null> {
  const path = generateMetaReportPath(storagePath);
  return loadJSONFile<MetaReportJSON>(path);
}

/**
 * Save email delivery report to storage
 */
export async function saveEmailDeliveryReport(
  storagePath: string,
  report: EmailDeliveryReportJSON
): Promise<void> {
  const path = generateEmailReportPath(storagePath);
  await saveJSONFile(path, report);
}

/**
 * Load email delivery report from storage
 */
export async function loadEmailDeliveryReport(
  storagePath: string
): Promise<EmailDeliveryReportJSON | null> {
  const path = generateEmailReportPath(storagePath);
  return loadJSONFile<EmailDeliveryReportJSON>(path);
}

/**
 * Update warning status in storage
 */
export async function updateWarningStatus(
  storagePath: string,
  studentId: string,
  status: WarningRecord['status']
): Promise<void> {
  const warningList = await loadWarningList(storagePath);
  
  if (!warningList) {
    throw new WarningStorageError(
      'Warning list not found',
      'NOT_FOUND',
      { storagePath }
    );
  }

  // Update the specific warning
  warningList.warnings = warningList.warnings.map(warning =>
    warning.student_id === studentId ? { ...warning, status } : warning
  );

  await saveWarningList(storagePath, warningList);
}

/**
 * Bulk update warning statuses
 */
export async function bulkUpdateWarningStatuses(
  storagePath: string,
  updates: Array<{ studentId: string; status: WarningRecord['status'] }>
): Promise<void> {
  const warningList = await loadWarningList(storagePath);
  
  if (!warningList) {
    throw new WarningStorageError(
      'Warning list not found',
      'NOT_FOUND',
      { storagePath }
    );
  }

  const updateMap = new Map(updates.map(u => [u.studentId, u.status]));

  warningList.warnings = warningList.warnings.map(warning => {
    const newStatus = updateMap.get(warning.student_id);
    return newStatus ? { ...warning, status: newStatus } : warning;
  });

  await saveWarningList(storagePath, warningList);
}

/**
 * Check if workflow files exist
 */
export async function workflowFilesExist(storagePath: string): Promise<{
  warningList: boolean;
  metaReport: boolean;
  emailReport: boolean;
}> {
  const [warningList, metaReport, emailReport] = await Promise.all([
    loadWarningList(storagePath),
    loadMetaReport(storagePath),
    loadEmailDeliveryReport(storagePath),
  ]);

  return {
    warningList: warningList !== null,
    metaReport: metaReport !== null,
    emailReport: emailReport !== null,
  };
}