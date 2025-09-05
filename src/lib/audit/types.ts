export interface AuditContext {
  adminId: string;
  adminName?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditLogEntry {
  action: string;
  objectType?: string;
  objectId?: string;
  objectLabel?: string;
  details?: {
    reason?: string;
    description?: string;
    metadata?: Record<string, any>;
  };
}

export type ObjectType = 'exeat' | 'service' | 'student' | 'admin' | 'user' | 'system';

export interface AdminActionRecord {
  id?: string;
  admin_id: string;
  action: string;
  object_type?: ObjectType;
  object_id?: string;
  object_label?: string;
  details?: Record<string, any>;
  created_at?: string;
}
