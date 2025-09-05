import { NextRequest } from 'next/server';
import { AuditService } from './AuditService';
import { ActionTemplates } from './ActionTemplates';
import type { AuditContext, AuditLogEntry } from './types';

export class AuditLogger {
  static async withContext(request: NextRequest): Promise<ContextualAuditLogger> {
    // Extract admin context from request headers (set by middleware)
    const adminId = request.headers.get('x-admin-id');
    const adminName = request.headers.get('x-admin-name');
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('cf-connecting-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const sessionId = request.headers.get('x-session-id');

    if (!adminId) {
      console.warn('No admin context found for audit logging');
      return new NoOpAuditLogger();
    }

    const context: AuditContext = {
      adminId,
      adminName: adminName || undefined,
      ipAddress,
      userAgent,
      sessionId: sessionId || undefined,
    };

    return new ContextualAuditLogger(context);
  }

  // For use outside request context (e.g., background jobs, system operations)
  static withAdmin(adminId: string, adminName?: string): ContextualAuditLogger {
    return new ContextualAuditLogger({ adminId, adminName });
  }

  // For system operations
  static system(): ContextualAuditLogger {
    return new ContextualAuditLogger({ adminId: 'system', adminName: 'System' });
  }
}

class ContextualAuditLogger {
  constructor(private context: AuditContext) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await AuditService.log(entry, this.context);
  }

  async logAsync(entry: AuditLogEntry): Promise<void> {
    await AuditService.logAsync(entry, this.context);
  }

  // Exeat template methods
  async approveExeat(studentName: string, reason: string): Promise<void> {
    await this.logAsync(ActionTemplates.approveExeat(studentName, reason));
  }

  async rejectExeat(studentName: string, reason: string): Promise<void> {
    await this.logAsync(ActionTemplates.rejectExeat(studentName, reason));
  }

  // Service template methods
  async createService(serviceName: string, description?: string): Promise<void> {
    await this.logAsync(ActionTemplates.createService(serviceName, description));
  }

  async cancelService(serviceName: string, reason: string): Promise<void> {
    await this.logAsync(ActionTemplates.cancelService(serviceName, reason));
  }

  async updateService(serviceName: string, changes: Record<string, any>): Promise<void> {
    await this.logAsync(ActionTemplates.updateService(serviceName, changes));
  }

  async completeService(serviceName: string): Promise<void> {
    await this.logAsync(ActionTemplates.completeService(serviceName));
  }

  async copyService(originalServiceName: string, newServiceName: string, newDate: string): Promise<void> {
    await this.logAsync(ActionTemplates.copyService(originalServiceName, newServiceName, newDate));
  }

  // Student template methods
  async manuallyClear(studentName: string, serviceName: string, reason: string): Promise<void> {
    await this.logAsync(ActionTemplates.manuallyClear(studentName, serviceName, reason));
  }

  async markPresent(studentName: string, serviceName: string): Promise<void> {
    await this.logAsync(ActionTemplates.markPresent(studentName, serviceName));
  }

  async markAbsent(studentName: string, serviceName: string): Promise<void> {
    await this.logAsync(ActionTemplates.markAbsent(studentName, serviceName));
  }

  async bulkUploadStudents(count: number, source: string): Promise<void> {
    await this.logAsync(ActionTemplates.bulkUploadStudents(count, source));
  }

  async updateStudent(studentName: string, changes: Record<string, any>): Promise<void> {
    await this.logAsync(ActionTemplates.updateStudent(studentName, changes));
  }

  async deleteStudent(studentName: string): Promise<void> {
    await this.logAsync(ActionTemplates.deleteStudent(studentName));
  }

  // User management template methods
  async createUser(userName: string, userType: string): Promise<void> {
    await this.logAsync(ActionTemplates.createUser(userName, userType));
  }

  async updateUser(userName: string, changes: Record<string, any>): Promise<void> {
    await this.logAsync(ActionTemplates.updateUser(userName, changes));
  }

  async deleteUser(userName: string): Promise<void> {
    await this.logAsync(ActionTemplates.deleteUser(userName));
  }

  async promoteUser(userName: string, fromRole: string, toRole: string): Promise<void> {
    await this.logAsync(ActionTemplates.promoteUser(userName, fromRole, toRole));
  }

  // Admin management template methods
  async createAdmin(adminName: string, role: string): Promise<void> {
    await this.logAsync(ActionTemplates.createAdmin(adminName, role));
  }

  async updateAdmin(adminName: string, changes: Record<string, any>): Promise<void> {
    await this.logAsync(ActionTemplates.updateAdmin(adminName, changes));
  }

  async deactivateAdmin(adminName: string): Promise<void> {
    await this.logAsync(ActionTemplates.deactivateAdmin(adminName));
  }

  // System template methods
  async systemMaintenance(action: string, details?: string): Promise<void> {
    await this.logAsync(ActionTemplates.systemMaintenance(action, details));
  }

  async dataExport(exportType: string, recordCount: number): Promise<void> {
    await this.logAsync(ActionTemplates.dataExport(exportType, recordCount));
  }

  async dataImport(importType: string, recordCount: number, source: string): Promise<void> {
    await this.logAsync(ActionTemplates.dataImport(importType, recordCount, source));
  }

  // Custom action method
  async custom(action: string, objectType?: string, objectLabel?: string, details?: any): Promise<void> {
    await this.logAsync(ActionTemplates.custom(action, objectType, objectLabel, details));
  }
}

// No-op logger for when there's no admin context
class NoOpAuditLogger extends ContextualAuditLogger {
  constructor() {
    super({ adminId: 'unknown' });
  }

  async log(): Promise<void> {
    // Do nothing
  }

  async logAsync(): Promise<void> {
    // Do nothing  
  }

  // Override all methods to do nothing
  async approveExeat(): Promise<void> {}
  async rejectExeat(): Promise<void> {}
  async createService(): Promise<void> {}
  async cancelService(): Promise<void> {}
  async updateService(): Promise<void> {}
  async completeService(): Promise<void> {}
  async copyService(): Promise<void> {}
  async manuallyClear(): Promise<void> {}
  async markPresent(): Promise<void> {}
  async markAbsent(): Promise<void> {}
  async bulkUploadStudents(): Promise<void> {}
  async updateStudent(): Promise<void> {}
  async deleteStudent(): Promise<void> {}
  async createUser(): Promise<void> {}
  async updateUser(): Promise<void> {}
  async deleteUser(): Promise<void> {}
  async promoteUser(): Promise<void> {}
  async createAdmin(): Promise<void> {}
  async updateAdmin(): Promise<void> {}
  async deactivateAdmin(): Promise<void> {}
  async systemMaintenance(): Promise<void> {}
  async dataExport(): Promise<void> {}
  async dataImport(): Promise<void> {}
  async custom(): Promise<void> {}
}
