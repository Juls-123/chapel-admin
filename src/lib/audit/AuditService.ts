import { createClient } from '@supabase/supabase-js';
import type { AuditContext, AuditLogEntry } from './types';

export class AuditService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  static async log(entry: AuditLogEntry, context: AuditContext): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('admin_actions')
        .insert({
          admin_id: context.adminId,
          action: entry.action,
          object_type: entry.objectType,
          object_id: entry.objectId,
          object_label: entry.objectLabel,
          details: {
            ...entry.details,
            ip_address: context.ipAddress,
            user_agent: context.userAgent,
            session_id: context.sessionId,
          },
        });

      if (error) {
        console.error('Audit log failed:', error);
        // Don't throw - audit failures shouldn't break main operations
      }
    } catch (error) {
      console.error('Audit service error:', error);
    }
  }

  // Batch logging for performance
  private static logQueue: Array<{ entry: AuditLogEntry; context: AuditContext }> = [];
  private static batchTimer: NodeJS.Timeout | null = null;

  static async logAsync(entry: AuditLogEntry, context: AuditContext): Promise<void> {
    this.logQueue.push({ entry, context });

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(async () => {
        await this.flushLogs();
      }, 5000); // Flush every 5 seconds
    }

    // Flush immediately if queue is full
    if (this.logQueue.length >= 10) {
      await this.flushLogs();
    }
  }

  private static async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const insertData = logsToFlush.map(({ entry, context }) => ({
        admin_id: context.adminId,
        action: entry.action,
        object_type: entry.objectType,
        object_id: entry.objectId,
        object_label: entry.objectLabel,
        details: {
          ...entry.details,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          session_id: context.sessionId,
        },
      }));

      const { error } = await this.supabase
        .from('admin_actions')
        .insert(insertData);

      if (error) {
        console.error('Batch audit log failed:', error);
      }
    } catch (error) {
      console.error('Batch audit service error:', error);
    }
  }

  // Force flush logs (useful for testing or shutdown)
  static async forceFlush(): Promise<void> {
    await this.flushLogs();
  }
}
