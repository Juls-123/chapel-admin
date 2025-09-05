import { ActionTemplates } from './ActionTemplates';
import { AuditLogger } from './AuditLogger';
import { AuditService } from './AuditService';

// Main exports for the audit system
export { AuditLogger } from './AuditLogger';
export { AuditService } from './AuditService';
export { ActionTemplates } from './ActionTemplates';
export { addAuditContext, getAdminContext } from './middleware';
export type { AuditContext, AuditLogEntry, ObjectType, AdminActionRecord } from './types';

// Convenience re-exports for common usage patterns
export const audit = {
  withContext: AuditLogger.withContext,
  withAdmin: AuditLogger.withAdmin,
  system: AuditLogger.system,
  templates: ActionTemplates,
  service: AuditService,
};
