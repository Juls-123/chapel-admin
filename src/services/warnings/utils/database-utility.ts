// src/lib/utils/warning-letters/database-utility.ts

import { db } from "@/lib/db"; // Your Drizzle instance
import { warningLetterWorkflows } from "../../../../drizzle/schema"; // Import the new table
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Workflow database record type
 */
export interface WorkflowDBRecord {
  workflowId: string;
  mode: 'single' | 'batch' | 'weekly';
  status: 'draft' | 'locked' | 'completed' | 'failed';
  startDate: string;
  endDate: string;
  workflowDate: string;
  totalServices: number;
  totalStudents: number;
  warningsGenerated: number;
  warningsSent: number;
  warningsExported: number;
  storagePath: string;
  initiatedBy: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/**
 * Insert workflow into database
 */
export async function insertWorkflowToDB(params: {
  workflowId: string;
  mode: 'single' | 'batch' | 'weekly';
  startDate: string;
  endDate: string;
  workflowDate: string;
  totalServices: number;
  storagePath: string;
  initiatedBy: string;
}): Promise<WorkflowDBRecord> {
  try {
    const [record] = await db.insert(warningLetterWorkflows).values({
      workflowId: params.workflowId,
      mode: params.mode,
      status: 'draft',
      startDate: params.startDate,
      endDate: params.endDate,
      workflowDate: params.workflowDate,
      totalServices: params.totalServices,
      totalStudents: 0,
      warningsGenerated: 0,
      warningsSent: 0,
      warningsExported: 0,
      storagePath: params.storagePath,
      initiatedBy: params.initiatedBy,
    }).returning();

    return record as WorkflowDBRecord;
  } catch (error) {
    throw new DatabaseError(
      'Failed to insert workflow',
      'INSERT_FAILED',
      { params, error }
    );
  }
}

/**
 * Update workflow in database
 */
export async function updateWorkflowInDB(
  workflowId: string,
  updates: {
    status?: 'draft' | 'locked' | 'completed' | 'failed';
    totalStudents?: number;
    warningsGenerated?: number;
    warningsSent?: number;
    warningsExported?: number;
    completedAt?: string;
    errorMessage?: string;
  }
): Promise<WorkflowDBRecord> {
  try {
    const [record] = await db
      .update(warningLetterWorkflows)
      .set(updates)
      .where(eq(warningLetterWorkflows.workflowId, workflowId))
      .returning();

    if (!record) {
      throw new DatabaseError(
        'Workflow not found',
        'NOT_FOUND',
        { workflowId }
      );
    }

    return record as WorkflowDBRecord;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    throw new DatabaseError(
      'Failed to update workflow',
      'UPDATE_FAILED',
      { workflowId, updates, error }
    );
  }
}

/**
 * Get workflow by ID
 */
export async function getWorkflowFromDB(
  workflowId: string
): Promise<WorkflowDBRecord | null> {
  try {
    const [record] = await db
      .select()
      .from(warningLetterWorkflows)
      .where(eq(warningLetterWorkflows.workflowId, workflowId))
      .limit(1);

    return record ? (record as WorkflowDBRecord) : null;
  } catch (error) {
    throw new DatabaseError(
      'Failed to get workflow',
      'GET_FAILED',
      { workflowId, error }
    );
  }
}

/**
 * List workflows with filters
 */
export async function listWorkflowsFromDB(filters?: {
  mode?: 'single' | 'batch' | 'weekly';
  status?: 'draft' | 'locked' | 'completed' | 'failed';
  startDate?: string;
  endDate?: string;
  initiatedBy?: string;
  limit?: number;
  offset?: number;
}): Promise<WorkflowDBRecord[]> {
  try {
    let query = db.select().from(warningLetterWorkflows);

    // Apply filters
    const conditions = [];

    if (filters?.mode) {
      conditions.push(eq(warningLetterWorkflows.mode, filters.mode));
    }

    if (filters?.status) {
      conditions.push(eq(warningLetterWorkflows.status, filters.status));
    }

    if (filters?.startDate) {
      conditions.push(gte(warningLetterWorkflows.workflowDate, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(warningLetterWorkflows.workflowDate, filters.endDate));
    }

    if (filters?.initiatedBy) {
      conditions.push(eq(warningLetterWorkflows.initiatedBy, filters.initiatedBy));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Order by most recent
    query = query.orderBy(desc(warningLetterWorkflows.createdAt)) as any;

    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const records = await query;
    return records as WorkflowDBRecord[];
  } catch (error) {
    throw new DatabaseError(
      'Failed to list workflows',
      'LIST_FAILED',
      { filters, error }
    );
  }
}

/**
 * Check if week is already processed
 */
export async function isWeekProcessedInDB(
  startDate: string,
  endDate: string
): Promise<boolean> {
  try {
    const [record] = await db
      .select()
      .from(warningLetterWorkflows)
      .where(
        and(
          eq(warningLetterWorkflows.mode, 'weekly'),
          eq(warningLetterWorkflows.startDate, startDate),
          eq(warningLetterWorkflows.endDate, endDate),
          sql`${warningLetterWorkflows.status} IN ('completed', 'locked')`
        )
      )
      .limit(1);

    return !!record;
  } catch (error) {
    throw new DatabaseError(
      'Failed to check week processing',
      'CHECK_FAILED',
      { startDate, endDate, error }
    );
  }
}

/**
 * Get workflow statistics
 */
export interface WorkflowStatistics {
  totalWorkflows: number;
  byMode: {
    single: number;
    batch: number;
    weekly: number;
  };
  byStatus: {
    draft: number;
    locked: number;
    completed: number;
    failed: number;
  };
  totalWarningsGenerated: number;
  totalWarningsSent: number;
  totalWarningsExported: number;
  totalStudentsAffected: number;
}

export async function getWorkflowStatistics(
  startDate?: string,
  endDate?: string
): Promise<WorkflowStatistics> {
  try {
    const conditions = [];

    if (startDate) {
      conditions.push(gte(warningLetterWorkflows.workflowDate, startDate));
    }

    if (endDate) {
      conditions.push(lte(warningLetterWorkflows.workflowDate, endDate));
    }

    let query = db.select().from(warningLetterWorkflows);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const workflows = await query;

    const stats: WorkflowStatistics = {
      totalWorkflows: workflows.length,
      byMode: { single: 0, batch: 0, weekly: 0 },
      byStatus: { draft: 0, locked: 0, completed: 0, failed: 0 },
      totalWarningsGenerated: 0,
      totalWarningsSent: 0,
      totalWarningsExported: 0,
      totalStudentsAffected: 0,
    };

    for (const workflow of workflows) {
      stats.byMode[workflow.mode as 'single' | 'batch' | 'weekly']++;
      stats.byStatus[workflow.status as 'draft' | 'locked' | 'completed' | 'failed']++;
      stats.totalWarningsGenerated += workflow.warningsGenerated || 0;
      stats.totalWarningsSent += workflow.warningsSent || 0;
      stats.totalWarningsExported += workflow.warningsExported || 0;
      stats.totalStudentsAffected += workflow.totalStudents || 0;
    }

    return stats;
  } catch (error) {
    throw new DatabaseError(
      'Failed to get statistics',
      'STATS_FAILED',
      { startDate, endDate, error }
    );
  }
}

/**
 * Delete workflow (only if draft or failed)
 */
export async function deleteWorkflowFromDB(
  workflowId: string
): Promise<void> {
  try {
    // First check status
    const workflow = await getWorkflowFromDB(workflowId);
    
    if (!workflow) {
      throw new DatabaseError(
        'Workflow not found',
        'NOT_FOUND',
        { workflowId }
      );
    }

    if (workflow.status === 'completed' || workflow.status === 'locked') {
      throw new DatabaseError(
        'Cannot delete completed or locked workflow',
        'WORKFLOW_PROTECTED',
        { workflowId, status: workflow.status }
      );
    }

    await db
      .delete(warningLetterWorkflows)
      .where(eq(warningLetterWorkflows.workflowId, workflowId));
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    throw new DatabaseError(
      'Failed to delete workflow',
      'DELETE_FAILED',
      { workflowId, error }
    );
  }
}

/**
 * Get recent workflows
 */
export async function getRecentWorkflows(
  limit: number = 10
): Promise<WorkflowDBRecord[]> {
  return listWorkflowsFromDB({ limit });
}

/**
 * Get workflows by admin
 */
export async function getWorkflowsByAdmin(
  adminId: string,
  limit?: number
): Promise<WorkflowDBRecord[]> {
  return listWorkflowsFromDB({
    initiatedBy: adminId,
    limit,
  });
}