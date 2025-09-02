# Attendance API TODO

## Endpoints to implement in Phase 2:

### GET /api/attendance/summary
- **Request**: Query params: `service_id?`, `level_id?`, `date_from?`, `date_to?`
- **Response**: `AttendanceSummary[]`
- **Validation**: Use `attendanceSummarySchema.array()` for response validation
- **Auth**: Require admin/staff role
- **Database**: Query `attendance_summary` table with optional filters

### GET /api/attendance/issues
- **Request**: Query params: `resolved?`, `service_id?`, `level_id?`
- **Response**: `Issue[]`
- **Validation**: Use `issueSchema.array()` for response validation
- **Auth**: Require admin/staff role
- **Database**: Query `issues` table with filters

## Implementation Notes:
- Summary data is pre-computed for performance
- Issues track unmatched scans and validation errors
- Support filtering by resolved status (default: unresolved only)
- Include related service and level information in responses
