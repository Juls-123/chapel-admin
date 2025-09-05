import type { AuditLogEntry } from './types';

export class ActionTemplates {
  // Exeat actions
  static approveExeat(studentName: string, reason: string): AuditLogEntry {
    return {
      action: `Approved Exeat for ${studentName}`,
      objectType: 'exeat',
      objectLabel: studentName,
      details: { reason: `Approved for '${reason}'` }
    };
  }

  static rejectExeat(studentName: string, reason: string): AuditLogEntry {
    return {
      action: `Rejected Exeat for ${studentName}`,
      objectType: 'exeat',
      objectLabel: studentName,
      details: { reason: `Rejected: ${reason}` }
    };
  }

  // Service actions
  static createService(serviceName: string, description?: string): AuditLogEntry {
    return {
      action: `Created Service ${serviceName}`,
      objectType: 'service',
      objectLabel: serviceName,
      details: { description }
    };
  }

  static cancelService(serviceName: string, reason: string): AuditLogEntry {
    return {
      action: `Cancelled Service ${serviceName}`,
      objectType: 'service',
      objectLabel: serviceName,
      details: { reason: `Cancelled due to ${reason}` }
    };
  }

  static updateService(serviceName: string, changes: Record<string, any>): AuditLogEntry {
    return {
      action: `Updated Service ${serviceName}`,
      objectType: 'service',
      objectLabel: serviceName,
      details: { description: 'Service details updated', metadata: changes }
    };
  }

  static completeService(serviceName: string): AuditLogEntry {
    return {
      action: `Completed Service ${serviceName}`,
      objectType: 'service',
      objectLabel: serviceName,
      details: { description: 'Service marked as completed' }
    };
  }

  static copyService(originalServiceName: string, newServiceName: string, newDate: string): AuditLogEntry {
    return {
      action: `Copied Service ${originalServiceName} to ${newServiceName}`,
      objectType: 'service',
      objectLabel: newServiceName,
      details: { 
        description: `Service copied from ${originalServiceName}`,
        metadata: { originalService: originalServiceName, newDate }
      }
    };
  }

  // Student actions
  static manuallyClear(studentName: string, serviceName: string, reason: string): AuditLogEntry {
    return {
      action: `Manually Cleared ${studentName}`,
      objectType: 'student',
      objectLabel: studentName,
      details: { reason: `Cleared for ${serviceName} due to ${reason}` }
    };
  }

  static markPresent(studentName: string, serviceName: string): AuditLogEntry {
    return {
      action: `Marked Present ${studentName}`,
      objectType: 'student',
      objectLabel: studentName,
      details: { reason: `Marked present for ${serviceName}` }
    };
  }

  static markAbsent(studentName: string, serviceName: string): AuditLogEntry {
    return {
      action: `Marked Absent ${studentName}`,
      objectType: 'student',
      objectLabel: studentName,
      details: { reason: `Marked absent from ${serviceName}` }
    };
  }

  static bulkUploadStudents(count: number, source: string): AuditLogEntry {
    return {
      action: `Bulk Uploaded ${count} Students`,
      objectType: 'student',
      details: { 
        description: `Uploaded ${count} students from ${source}`,
        metadata: { count, source }
      }
    };
  }

  static updateStudent(studentName: string, changes: Record<string, any>): AuditLogEntry {
    return {
      action: `Updated Student ${studentName}`,
      objectType: 'student',
      objectLabel: studentName,
      details: { description: 'Student profile updated', metadata: changes }
    };
  }

  static deleteStudent(studentName: string): AuditLogEntry {
    return {
      action: `Deleted Student ${studentName}`,
      objectType: 'student',
      objectLabel: studentName,
      details: { description: 'Student record permanently deleted' }
    };
  }

  // User management
  static createUser(userName: string, userType: string): AuditLogEntry {
    return {
      action: `Created ${userType} ${userName}`,
      objectType: 'user',
      objectLabel: userName,
      details: { description: `New ${userType} account created` }
    };
  }

  static updateUser(userName: string, changes: Record<string, any>): AuditLogEntry {
    return {
      action: `Updated User ${userName}`,
      objectType: 'user', 
      objectLabel: userName,
      details: { description: 'User profile updated', metadata: changes }
    };
  }

  static deleteUser(userName: string): AuditLogEntry {
    return {
      action: `Deleted User ${userName}`,
      objectType: 'user',
      objectLabel: userName,
      details: { description: 'User account permanently deleted' }
    };
  }

  static promoteUser(userName: string, fromRole: string, toRole: string): AuditLogEntry {
    return {
      action: `Promoted ${userName} from ${fromRole} to ${toRole}`,
      objectType: 'user',
      objectLabel: userName,
      details: { 
        description: 'User role changed',
        metadata: { fromRole, toRole }
      }
    };
  }

  // Admin actions
  static createAdmin(adminName: string, role: string): AuditLogEntry {
    return {
      action: `Created Admin ${adminName}`,
      objectType: 'admin',
      objectLabel: adminName,
      details: { description: `New ${role} admin created` }
    };
  }

  static updateAdmin(adminName: string, changes: Record<string, any>): AuditLogEntry {
    return {
      action: `Updated Admin ${adminName}`,
      objectType: 'admin',
      objectLabel: adminName,
      details: { description: 'Admin profile updated', metadata: changes }
    };
  }

  static deactivateAdmin(adminName: string): AuditLogEntry {
    return {
      action: `Deactivated Admin ${adminName}`,
      objectType: 'admin',
      objectLabel: adminName,
      details: { description: 'Admin account deactivated' }
    };
  }

  // System actions
  static systemMaintenance(action: string, details?: string): AuditLogEntry {
    return {
      action: `System: ${action}`,
      objectType: 'system',
      details: { description: details }
    };
  }

  static dataExport(exportType: string, recordCount: number): AuditLogEntry {
    return {
      action: `Exported ${exportType} Data`,
      objectType: 'system',
      details: { 
        description: `Exported ${recordCount} ${exportType} records`,
        metadata: { exportType, recordCount }
      }
    };
  }

  static dataImport(importType: string, recordCount: number, source: string): AuditLogEntry {
    return {
      action: `Imported ${importType} Data`,
      objectType: 'system',
      details: { 
        description: `Imported ${recordCount} ${importType} records from ${source}`,
        metadata: { importType, recordCount, source }
      }
    };
  }

  // Custom action
  static custom(action: string, objectType?: string, objectLabel?: string, details?: any): AuditLogEntry {
    return {
      action,
      objectType,
      objectLabel,
      details
    };
  }
}
