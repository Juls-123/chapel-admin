// src/lib/utils/warning-letters/admin-action-logger.ts

import { db } from "@/lib/db";
import { adminActions } from "../../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export class AdminActionLoggerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AdminActionLoggerError";
  }
}

/**
 * Log workflow creation
 */
export async function logWorkflowCreated(params: {
  adminId: string;
  workflowId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  servicesCount: number;
  studentsCount: number;
}): Promise<void> {
  try {
    await db.insert(adminActions).values({
      adminId: params.adminId,
      action: 'warning_workflow_created',
      objectType: 'warning_workflow',
      objectId: params.workflowId,
      objectLabel: `${params.mode.charAt(0).toUpperCase() + params.mode.slice(1)} Warning Letters (${params.dateRange})`,
      details: {
        mode: params.mode,
        date_range: params.dateRange,
        services_count: params.servicesCount,
        students_count: params.studentsCount,
      },
    });
  } catch (error) {
    console.error('Failed to log workflow creation:', error);
    throw new AdminActionLoggerError(
      'Failed to log workflow creation',
      'LOG_FAILED',
      { params, error }
    );
  }
}

/**
 * Log warning letters generation
 */
export async function logWarningsGenerated(params: {
  adminId: string;
  workflowId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  warningsGenerated: number;
  byLevel: Record<string, number>;
}): Promise<void> {
  try {
    await db.insert(adminActions).values({
      adminId: params.adminId,
      action: 'warning_letters_generated',
      objectType: 'warning_workflow',
      objectId: params.workflowId,
      objectLabel: `${params.mode.charAt(0).toUpperCase() + params.mode.slice(1)} Warning Letters (${params.dateRange})`,
      details: {
        warnings_generated: params.warningsGenerated,
        by_level: params.byLevel,
      },
    });
  } catch (error) {
    console.error('Failed to log warnings generation:', error);
    throw new AdminActionLoggerError(
      'Failed to log warnings generation',
      'LOG_FAILED',
      { params, error }
    );
  }
}

/**
 * Log warning letters sent
 */
export async function logWarningsSent(params: {
  adminId: string;
  workflowId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  totalSent: number;
  failed: number;
  batchSize?: number;
}): Promise<void> {
  try {
    await db.insert(adminActions).values({
      adminId: params.adminId,
      action: 'warning_letters_sent',
      objectType: 'warning_workflow',
      objectId: params.workflowId,
      objectLabel: `${params.mode.charAt(0).toUpperCase() + params.mode.slice(1)} Warning Letters (${params.dateRange})`,
      details: {
        total_sent: params.totalSent,
        failed: params.failed,
        batch_size: params.batchSize,
      },
    });
  } catch (error) {
    console.error('Failed to log warnings sent:', error);
    throw new AdminActionLoggerError(
      'Failed to log warnings sent',
      'LOG_FAILED',
      { params, error }
    );
  }
}

/**
 * Log warning letters exported
 */
export async function logWarningsExported(params: {
  adminId: string;
  workflowId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  format: 'csv' | 'pdf';
  count: number;
  groupedByLevel?: boolean;
}): Promise<void> {
  try {
    await db.insert(adminActions).values({
      adminId: params.adminId,
      action: 'warning_letters_exported',
      objectType: 'warning_workflow',
      objectId: params.workflowId,
      objectLabel: `${params.mode.charAt(0).toUpperCase() + params.mode.slice(1)} Warning Letters (${params.dateRange})`,
      details: {
        format: params.format,
        count: params.count,
        grouped_by_level: params.groupedByLevel,
      },
    });
  } catch (error) {
    console.error('Failed to log warnings export:', error);
    throw new AdminActionLoggerError(
      'Failed to log warnings export',
      'LOG_FAILED',
      { params, error }
    );
  }
}

/**
 * Log workflow locked
 */
export async function logWorkflowLocked(params: {
  adminId: string;
  workflowId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
}): Promise<void> {
  try {
    await db.insert(adminActions).values({
      adminId: params.adminId,
      action: 'warning_workflow_locked',
      objectType: 'warning_workflow',
      objectId: params.workflowId,
      objectLabel: `${params.mode.charAt(0).toUpperCase() + params.mode.slice(1)} Warning Letters (${params.dateRange})`,
      details: {
        locked_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log workflow lock:', error);
    throw new AdminActionLoggerError(
      'Failed to log workflow lock',
      'LOG_FAILED',
      { params, error }
    );
  }
}

/**
 * Log workflow completed
 */
export async function logWorkflowCompleted(params: {
  adminId: string;
  workflowId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  finalStats: {
    warningsGenerated: number;
    warningsSent: number;
    warningsExported: number;
  };
}): Promise<void> {
  try {
    await db.insert(adminActions).values({
      adminId: params.adminId,
      action: 'warning_workflow_completed',
      objectType: 'warning_workflow',
      objectId: params.workflowId,
      objectLabel: `${params.mode.charAt(0).toUpperCase() + params.mode.slice(1)} Warning Letters (${params.dateRange})`,
      details: {
        completed_at: new Date().toISOString(),
        final_stats: params.finalStats,
      },
    });
  } catch (error) {
    console.error('Failed to log workflow completion:', error);
    throw new AdminActionLoggerError(
      'Failed to log workflow completion',
      'LOG_FAILED',
      { params, error }
    );
  }
}

/**
 * Log workflow failed
 */
export async function logWorkflowFailed(params: {
  adminId: string;
  workflowId: string;
  mode: 'single' | 'batch' | 'weekly';
  dateRange: string;
  error: unknown;
}): Promise<void> {
  try {
    await db.insert(adminActions).values({
      adminId: params.adminId,
      action: 'warning_workflow_failed',
      objectType: 'warning_workflow',
      objectId: params.workflowId,
      objectLabel: `${params.mode.charAt(0).toUpperCase() + params.mode.slice(1)} Warning Letters (${params.dateRange})`,
      details: {
        failed_at: new Date().toISOString(),
        error: params.error instanceof Error ? params.error.message : String(params.error),
      },
    });
  } catch (error) {
    console.error('Failed to log workflow failure:', error);
    throw new AdminActionLoggerError(
      'Failed to log workflow failure',
      'LOG_FAILED',
      { params, error }
    );
  }
}

/**
 * Get admin actions for a workflow
 */
export async function getWorkflowActions(
  workflowId: string
): Promise<Array<{
  id: string;
  action: string;
  createdAt: string;
  adminId: string;
  details: any;
}>> {
  try {
    const actions = await db
      .select()
      .from(adminActions)
      .where(eq(adminActions.objectId, workflowId))
      .orderBy(adminActions.createdAt);

    return actions.map(action => ({
      id: action.id,
      action: action.action,
      createdAt: action.createdAt!,
      adminId: action.adminId!,
      details: action.details,
    }));
  } catch (error) {
    throw new AdminActionLoggerError(
      'Failed to get workflow actions',
      'GET_FAILED',
      { workflowId, error }
    );
  }
}

/**
 * Get recent warning workflow actions
 */
export async function getRecentWarningActions(
  limit: number = 50
): Promise<Array<{
  id: string;
  action: string;
  createdAt: string;
  objectLabel: string;
  adminId: string;
  details: any;
}>> {
  try {
    const actions = await db
      .select()
      .from(adminActions)
      .where(eq(adminActions.objectType, 'warning_workflow'))
      .orderBy(desc(adminActions.createdAt))
      .limit(limit);

    return actions.map(action => ({
      id: action.id,
      action: action.action,
      createdAt: action.createdAt!,
      objectLabel: action.objectLabel || '',
      adminId: action.adminId!,
      details: action.details,
    }));
  } catch (error) {
    throw new AdminActionLoggerError(
      'Failed to get recent actions',
      'GET_FAILED',
      { error }
    );
  }
}