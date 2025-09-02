# Students API TODO

## Endpoints to implement in Phase 2:

### GET /api/students
- **Request**: Query params: `level_id?`, `status?`, `page?`, `limit?`
- **Response**: `Student[]`
- **Validation**: Use `studentSchema.array()` for response validation
- **Auth**: Require admin/staff role
- **Database**: Query `students` table with joins to `levels`

### GET /api/students/:id
- **Request**: Path param: `id` (UUID)
- **Response**: `Student`
- **Validation**: Use `studentSchema` for response validation
- **Auth**: Require admin/staff role or student owns record
- **Database**: Query single student with level info

### GET /api/students/:id/attendance
- **Request**: Path param: `id` (UUID), Query params: `semester_id?`, `service_type?`
- **Response**: `VwStudentProfileAttendance[]`
- **Validation**: Use `vwStudentProfileAttendanceSchema.array()` for response validation
- **Auth**: Require admin/staff role or student owns record
- **Database**: Query `vw_student_profile` view

## Implementation Notes:
- Use Supabase client for database queries
- Implement proper error handling with ErrorHandler
- Add request validation using Zod schemas
- Include pagination for list endpoints
- Add proper TypeScript types for all handlers
