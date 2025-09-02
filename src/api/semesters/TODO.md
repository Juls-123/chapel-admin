# Semesters API TODO

## Endpoints to implement in Phase 2:

### GET /api/semesters
- **Request**: Query params: `active?`, `page?`, `limit?`
- **Response**: `Semester[]`
- **Validation**: Use `semesterSchema.array()` for response validation
- **Auth**: Require admin/staff role
- **Database**: Query `semesters` table

### GET /api/semesters/current
- **Request**: No params
- **Response**: `Semester`
- **Validation**: Use `semesterSchema` for response validation
- **Auth**: Require admin/staff role
- **Database**: Query current semester based on date range

## Implementation Notes:
- Current semester determined by start_date <= now <= end_date
- Support filtering for active semesters (end_date >= now)
- Order by start_date DESC for most recent first
