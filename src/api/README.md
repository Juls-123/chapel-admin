# API Endpoints Documentation

This document outlines the API endpoints that will be implemented in Phase 2. All endpoints are read-only for Phase 1 scaffolding.

## Authentication
All endpoints require authentication headers (to be implemented with Supabase Auth in Phase 2).

## Endpoints

### Students
- **GET /api/students**
  - Returns: `Student[]`
  - Description: Fetch all active students
  - Query params: `level_id?`, `status?`

- **GET /api/students/:id**
  - Returns: `Student`
  - Description: Fetch single student by ID

- **GET /api/students/:id/attendance**
  - Returns: `VwStudentProfileAttendance[]`
  - Description: Fetch student's attendance history using vw_student_profile view

### Services
- **GET /api/services**
  - Returns: `Service[]`
  - Description: Fetch all services
  - Query params: `type?`, `status?`, `date_from?`, `date_to?`

- **GET /api/services/:id**
  - Returns: `Service`
  - Description: Fetch single service by ID

### Semesters
- **GET /api/semesters**
  - Returns: `Semester[]`
  - Description: Fetch all semesters

- **GET /api/semesters/current**
  - Returns: `Semester`
  - Description: Fetch current active semester

### Levels
- **GET /api/levels**
  - Returns: `Level[]`
  - Description: Fetch all academic levels (100L, 200L, 300L, 400L)

### Attendance Summary
- **GET /api/attendance/summary**
  - Returns: `AttendanceSummary[]`
  - Description: Fetch attendance summaries
  - Query params: `service_id?`, `level_id?`

### Issues
- **GET /api/issues**
  - Returns: `Issue[]`
  - Description: Fetch unresolved attendance issues
  - Query params: `resolved?`, `service_id?`

## Response Format
All responses follow this format:
```json
{
  "data": [...],
  "error": null,
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 50
  }
}
```

## Error Handling
Errors return:
```json
{
  "data": null,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## TODO: Phase 2 Implementation
- Implement Supabase Auth middleware
- Add request validation using Zod schemas
- Implement database queries
- Add pagination support
- Add proper error handling
- Add rate limiting
- Add logging and monitoring
