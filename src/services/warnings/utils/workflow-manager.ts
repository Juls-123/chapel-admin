// src/lib/utils/warning-letters/workflow-manager.ts

import { v4 as uuidv4 } from 'uuid';
import {
  generateStoragePath,
  saveWarningList,
  saveMetaReport,
  loadWarningList,
  loadMetaReport,
  type WarningListJSON,
  type MetaReportJSON,
  type ServiceInfo,
} from './storage-utility';
import {
  insertWorkflowToDB,
  updateWorkflowInDB,
  getWorkflowFromDB,
  isWeekProcessedInDB,
  type WorkflowDBRecord,
} from './database-utility';
import {
  logWorkflowCreated,
  logWarningsGenerated,
  logWarningsSent,
  logWarningsExported,
  logWorkflowLocked,
  logWorkflowCompleted,
  logWorkflowFailed,
} from './admin-action-logger';

export class WorkflowManagerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "WorkflowManagerError";
  }
}

/**
 * Create workflow parameters
 */
export interface CreateWorkflowParams {
  mode: 'single' | 'batch' | 'weekly';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  servicesProcessed: ServiceInfo[];
  initiatedBy: {
    adminId: string;
    adminName: string;
    adminEmail: string;
  };
}

/**
 * Complete workflow result
 */
export interface WorkflowResult {
  workflowId: string;
  storagePath: string;
  dbRecord: WorkflowDBRecord;
}

/**
 * Create a new workflow (DB + Storage + Logging)
 */
export async function createWorkflow(
  params: CreateWorkflowParams
): Promise<WorkflowResult> {
  const workflowId = uuidv4();
  const workflowDate = new Date(); // Today's date for folder structure
  
  try {
    // 1. Generate storage path (Pascal case: YYYY/MM/DD/Mode/uuid)
    const storagePath = generateStoragePath(
      workflowDate,
      params.mode,
      workflowId
    );

    // 2. Validate weekly workflow (prevent duplicates)
    if (params.mode === 'weekly') {
      const alreadyProcessed = await isWeekProcessedInDB(
        params.startDate,
        params.endDate
      );

      if (alreadyProcessed) {
        throw new WorkflowManagerError(
          'Week already processed',
          'WEEK_DUPLICATE',
          { startDate: params.startDate, endDate: params.endDate }
        );
      }
    }

    // 3. Insert into database
    const dbRecord = await insertWorkflowToDB({
      workflowId,
      mode: params.mode,
      startDate: params.startDate,
      endDate: params.endDate,
      workflowDate: workflowDate.toISOString().split('T')[0],
      totalServices: params.servicesProcessed.length,
      storagePath,
      initiatedBy: params.initiatedBy.adminId,
    });

    // 4. Create initial meta report in storage
    const metaReport: MetaReportJSON = {
      workflow_id: workflowId,
      mode: params.mode,
      status: 'draft',
      date_range: {
        start: params.startDate,
        end: params.endDate,
      },
      services_processed: params.servicesProcessed,
      statistics: {
        total_services: params.servicesProcessed.length,
        total_students_scanned: 0,
        total_absentees: 0,
        warnings_generated: 0,
        warnings_sent: 0,
        warnings_failed: 0,
        warnings_exported: 0,
      },
      initiated_by: {
        admin_id: params.initiatedBy.adminId,
        admin_name: params.initiatedBy.adminName,
        admin_email: params.initiatedBy.adminEmail,
      },
      timestamps: {
        created_at: new Date().toISOString(),
      },
    };

    await saveMetaReport(storagePath, metaReport);

    // 5. Log admin action
    await logWorkflowCreated({
      adminId: params.initiatedBy.adminId,
      workflowId,
      mode: params.mode,
      dateRange: `${params.startDate} to ${params.endDate}`,
      servicesCount: params.servicesProcessed.length,
      studentsCount: 0,
    });

    return {
      workflowId,
      storagePath,
      dbRecord,
    };
  } catch (error) {
    if (error instanceof WorkflowManagerError) {
      throw error;
    }

    throw new WorkflowManagerError(
      'Failed to create workflow',
      'CREATE_FAILED',
      { params, error }
    );
  }
}

/**
 * Save warning list (Storage + DB update + Logging)
 */
export async function saveWarnings(params: {
  workflowId: string;
  storagePath: string;
  warningList: WarningListJSON;
  adminId: string;
}): Promise<void> {
  try {
    // 1. Save to storage
    await saveWarningList(params.storagePath, params.warningList);

    // 2. Update database counts
    await updateWorkflowInDB(params.workflowId, {
      totalStudents: params.warningList.summary.total_students,
      warningsGenerated: params.warningList.summary.total_students,
    });

    // 3. Update meta report in storage
    const metaReport = await loadMetaReport(params.storagePath);
    if (metaReport) {
      metaReport.statistics.warnings_generated = params.warningList.summary.total_students;
      metaReport.statistics.total_absentees = params.warningList.summary.total_students;
      await saveMetaReport(params.storagePath, metaReport);
    }

    // 4. Log admin action
    await logWarningsGenerated({
      adminId: params.adminId,
      workflowId: params.workflowId,
      mode: params.warningList.mode,
      dateRange: `${params.warningList.date_range.start} to ${params.warningList.date_range.end}`,
      warningsGenerated: params.warningList.summary.total_students,
      byLevel: params.warningList.summary.by_level,
    });
  } catch (error) {
    throw new WorkflowManagerError(
      'Failed to save warnings',
      'SAVE_FAILED',
      { params, error }
    );
  }
}

/**
 * Lock workflow for processing
 */
export async function lockWorkflow(params: {
  workflowId: string;
  storagePath: string;
  adminId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
}): Promise<void> {
  try {
    // 1. Update database
    await updateWorkflowInDB(params.workflowId, {
      status: 'locked',
    });

    // 2. Update meta report
    const metaReport = await loadMetaReport(params.storagePath);
    if (metaReport) {
      metaReport.status = 'locked';
      metaReport.timestamps.locked_at = new Date().toISOString();
      await saveMetaReport(params.storagePath, metaReport);
    }

    // 3. Log admin action
    await logWorkflowLocked({
      adminId: params.adminId,
      workflowId: params.workflowId,
      mode: params.mode,
      dateRange: params.dateRange,
    });
  } catch (error) {
    throw new WorkflowManagerError(
      'Failed to lock workflow',
      'LOCK_FAILED',
      { params, error }
    );
  }
}

/**
 * Complete workflow
 */
export async function completeWorkflow(params: {
  workflowId: string;
  storagePath: string;
  adminId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  finalCounts: {
    warningsSent: number;
    warningsExported: number;
  };
}): Promise<void> {
  try {
    const completedAt = new Date().toISOString();

    // 1. Update database
    await updateWorkflowInDB(params.workflowId, {
      status: 'completed',
      warningsSent: params.finalCounts.warningsSent,
      warningsExported: params.finalCounts.warningsExported,
      completedAt,
    });

    // 2. Update meta report
    const metaReport = await loadMetaReport(params.storagePath);
    if (metaReport) {
      metaReport.status = 'completed';
      metaReport.statistics.warnings_sent = params.finalCounts.warningsSent;
      metaReport.statistics.warnings_exported = params.finalCounts.warningsExported;
      metaReport.timestamps.completed_at = completedAt;
      await saveMetaReport(params.storagePath, metaReport);
    }

    // 3. Log admin action
    const dbRecord = await getWorkflowFromDB(params.workflowId);
    await logWorkflowCompleted({
      adminId: params.adminId,
      workflowId: params.workflowId,
      mode: params.mode,
      dateRange: params.dateRange,
      finalStats: {
        warningsGenerated: dbRecord?.warningsGenerated || 0,
        warningsSent: params.finalCounts.warningsSent,
        warningsExported: params.finalCounts.warningsExported,
      },
    });
  } catch (error) {
    throw new WorkflowManagerError(
      'Failed to complete workflow',
      'COMPLETE_FAILED',
      { params, error }
    );
  }
}

/**
 * Fail workflow
 */
export async function failWorkflow(params: {
  workflowId: string;
  storagePath: string;
  adminId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  error: unknown;
}): Promise<void> {
  try {
    const errorMessage = params.error instanceof Error 
      ? params.error.message 
      : String(params.error);

    // 1. Update database
    await updateWorkflowInDB(params.workflowId, {
      status: 'failed',
      errorMessage,
    });

    // 2. Update meta report
    const metaReport = await loadMetaReport(params.storagePath);
    if (metaReport) {
      metaReport.status = 'failed';
      metaReport.error_details = params.error;
      await saveMetaReport(params.storagePath, metaReport);
    }

    // 3. Log admin action
    await logWorkflowFailed({
      adminId: params.adminId,
      workflowId: params.workflowId,
      mode: params.mode,
      dateRange: params.dateRange,
      error: params.error,
    });
  } catch (error) {
    console.error('Failed to mark workflow as failed:', error);
  }
}

/**
 * Track email sending
 */
export async function trackEmailsSent(params: {
  workflowId: string;
  storagePath: string;
  adminId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  totalSent: number;
  failed: number;
}): Promise<void> {
  try {
    // 1. Update database
    await updateWorkflowInDB(params.workflowId, {
      warningsSent: params.totalSent,
    });

    // 2. Update meta report
    const metaReport = await loadMetaReport(params.storagePath);
    if (metaReport) {
      metaReport.statistics.warnings_sent = params.totalSent;
      metaReport.statistics.warnings_failed = params.failed;
      await saveMetaReport(params.storagePath, metaReport);
    }

    // 3. Log admin action
    await logWarningsSent({
      adminId: params.adminId,
      workflowId: params.workflowId,
      mode: params.mode,
      dateRange: params.dateRange,
      totalSent: params.totalSent,
      failed: params.failed,
    });
  } catch (error) {
    throw new WorkflowManagerError(
      'Failed to track emails sent',
      'TRACK_FAILED',
      { params, error }
    );
  }
}

/**
 * Track export
 */
export async function trackExport(params: {
  workflowId: string;
  storagePath: string;
  adminId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  format: 'csv' | 'pdf';
  count: number;
  groupedByLevel?: boolean;
}): Promise<void> {
  try {
    // 1. Update database
    const currentRecord = await getWorkflowFromDB(params.workflowId);
    const newExportCount = (currentRecord?.warningsExported || 0) + params.count;
    
    await updateWorkflowInDB(params.workflowId, {
      warningsExported: newExportCount,
    });

    // 2. Update meta report
    const metaReport = await loadMetaReport(params.storagePath);
    if (metaReport) {
      metaReport.statistics.warnings_exported = newExportCount;
      await saveMetaReport(params.storagePath, metaReport);
    }

    // 3. Log admin action
    await logWarningsExported({
      adminId: params.adminId,
      workflowId: params.workflowId,
      mode: params.mode,
      dateRange: params.dateRange,
      format: params.format,
      count: params.count,
      groupedByLevel: params.groupedByLevel,
    });
  } catch (error) {
    throw new WorkflowManagerError(
      'Failed to track export',
      'TRACK_FAILED',
      { params, error }
    );
  }
}

/**
 * Get complete workflow data (DB + Storage)
 */
export async function getCompleteWorkflow(workflowId: string): Promise<{
  dbRecord: WorkflowDBRecord;
  warningList: WarningListJSON | null;
  metaReport: MetaReportJSON | null;
} | null> {
  try {
    const dbRecord = await getWorkflowFromDB(workflowId);
    
    if (!dbRecord) {
      return null;
    }

    const [warningList, metaReport] = await Promise.all([
      loadWarningList(dbRecord.storagePath),
      loadMetaReport(dbRecord.storagePath),
    ]);

    return {
      dbRecord,
      warningList,
      metaReport,
    };
  } catch (error) {
    throw new WorkflowManagerError(
      'Failed to get complete workflow',
      'GET_FAILED',
      { workflowId, error }
    );
  }
}