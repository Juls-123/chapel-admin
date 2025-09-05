# Chapel Admin Audit System

A comprehensive audit logging system for tracking administrative actions in the chapel administration system.

## Overview

The audit system provides:
- **Automatic batching** for performance optimization
- **Admin context extraction** from requests
- **Template-based logging** for consistency
- **Async logging** that won't slow down API responses
- **Error resilience** - audit failures won't break main operations

## Quick Start

### 1. Import the AuditLogger

```typescript
import { AuditLogger } from '@/lib/audit';
```

### 2. Use in API Routes

```typescript
export async function POST(request: NextRequest) {
  // Get audit logger with admin context
  const audit = await AuditLogger.withContext(request);
  
  try {
    // Your main business logic
    const result = await createService(data);
    
    // Log the action (async, won't slow down response)
    await audit.createService(result.name, "Weekly prayer session");
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

## Available Template Methods

### Exeat Operations
```typescript
await audit.approveExeat("John Doe", "Family emergency");
await audit.rejectExeat("Jane Smith", "Insufficient documentation");
```

### Service Operations
```typescript
await audit.createService("Evening Prayer", "Weekly prayer session");
await audit.cancelService("Morning Service", "power outage");
await audit.updateService("Evening Prayer", { time: "7:00 PM" });
await audit.completeService("Morning Service");
await audit.copyService("Morning Service", "Special Morning Service", "2024-01-15");
```

### Student Operations
```typescript
await audit.manuallyClear("Bob Johnson", "Morning Service", "scanner issue");
await audit.markPresent("Alice Brown", "Evening Prayer");
await audit.markAbsent("Charlie Davis", "Morning Service");
await audit.bulkUploadStudents(50, "CSV import");
await audit.updateStudent("John Doe", { level: "300" });
await audit.deleteStudent("Old Student");
```

### User Management
```typescript
await audit.createUser("New Admin", "admin");
await audit.updateUser("John Doe", { email: "new@example.com" });
await audit.deleteUser("Old User");
await audit.promoteUser("Jane Smith", "admin", "superadmin");
```

### Admin Management
```typescript
await audit.createAdmin("New Admin", "superadmin");
await audit.updateAdmin("John Admin", { role: "admin" });
await audit.deactivateAdmin("Old Admin");
```

### System Operations
```typescript
await audit.systemMaintenance("Database backup", "Weekly backup completed");
await audit.dataExport("students", 150);
await audit.dataImport("services", 25, "Excel file");
```

### Custom Actions
```typescript
await audit.custom("Bulk imported students", "system", "50 students", { 
  source: "CSV",
  timestamp: new Date().toISOString()
});
```

## Usage Patterns

### For Request Context (Most Common)
```typescript
const audit = await AuditLogger.withContext(request);
```

### For Background Jobs
```typescript
const audit = AuditLogger.withAdmin(adminId, "Admin Name");
```

### For System Operations
```typescript
const audit = AuditLogger.system();
```

## Best Practices

### ✅ Do
- Log AFTER successful operations
- Use async logging (won't block responses)
- Use template methods when available
- Include context (who, what, why)
- Log bulk operations with counts

### ❌ Don't
- Log failed operations
- Log read operations
- Block API responses with synchronous logging
- Log sensitive data in details

## Implementation Notes

### Batching
- Logs are batched automatically for performance
- Batches flush every 5 seconds or when 10 items are queued
- Use `AuditService.forceFlush()` for testing

### Error Handling
- Audit failures are logged but don't throw errors
- Main operations continue even if audit logging fails
- No-op logger is used when admin context is missing

### Database Schema
The system expects an `admin_actions` table with:
- `admin_id` (string)
- `action` (string)
- `object_type` (string, optional)
- `object_id` (string, optional)
- `object_label` (string, optional)
- `details` (JSON, optional)
- `created_at` (timestamp)

## Examples

### Service Creation with Audit
```typescript
export async function POST(request: NextRequest) {
  const audit = await AuditLogger.withContext(request);
  
  try {
    const body = await request.json();
    const service = await createService(body);
    
    // Log successful creation
    await audit.createService(
      service.name || service.type,
      `${service.type} service for ${service.applicable_levels?.join(', ')}`
    );
    
    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
```

### Bulk Student Upload with Audit
```typescript
export async function POST(request: NextRequest) {
  const audit = await AuditLogger.withContext(request);
  
  try {
    const students = await uploadStudents(data);
    
    // Log bulk operation
    await audit.bulkUploadStudents(students.length, "Excel upload");
    
    return NextResponse.json({ 
      success: true, 
      message: `${students.length} students uploaded successfully` 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
```

### Manual Attendance Override with Audit
```typescript
export async function PATCH(request: NextRequest) {
  const audit = await AuditLogger.withContext(request);
  
  try {
    const { studentId, serviceId, status, reason } = await request.json();
    
    await updateAttendance(studentId, serviceId, status);
    
    const student = await getStudent(studentId);
    const service = await getService(serviceId);
    
    if (status === 'present') {
      await audit.markPresent(student.name, service.name);
    } else if (status === 'cleared') {
      await audit.manuallyClear(student.name, service.name, reason);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
```
