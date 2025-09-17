# Chapel Attendance Management System - User Stories

## Overview
This document outlines the complete user stories for the Chapel Attendance Management System, designed to manage student attendance tracking, warning letters, exeats, and administrative functions.

## System Roles
- **Admin**: Standard administrative access
- **Super Admin**: Full system access including user management and student registration

---

## 1. DASHBOARD (Admin & Super Admin)

### US-001: Dashboard Overview
**As an** Admin  
**I want to** see a comprehensive dashboard when I log in  
**So that** I can quickly understand today's attendance status and system metrics

#### Acceptance Criteria:
- [ ] Display welcome back message with daily counter
- [ ] Show "Total scanned (today)" with daily reset functionality
- [ ] Display percentage change from yesterday (e.g., "+15.2% from yesterday")
- [ ] Show "Current absentees" count per service with daily reset
- [ ] Display sub-statistic showing change since last service (e.g., "-5 since last service")
- [ ] All statistics should be computed via database views for performance

#### Technical Notes:
- Uses `attendance_summary` table for aggregated statistics
- Daily counters should reset at midnight
- Percentage calculations computed from historical data

### US-002: Warning Letters Dashboard Widget
**As an** Admin  
**I want to** see pending warning letters on my dashboard  
**So that** I can track warnings that haven't been sent

#### Acceptance Criteria:
- [ ] Display count of pending warnings (status != 'sent')
- [ ] Show sub-statistic "X new this week"
- [ ] Warning triggered when student misses >2 services in a week
- [ ] Handle edge case: Additional misses in same week don't create duplicate warnings

#### Technical Notes:
- Uses `warning_weekly_snapshot` table
- Warning status managed through `warning_status` enum

### US-003: Exeat Tracking Widget
**As an** Admin  
**I want to** see recent exeats and those ending today  
**So that** I can track student exemptions

#### Acceptance Criteria:
- [ ] Display recent exeats count
- [ ] Show sub-statistic "X ending today"
- [ ] Daily recomputation of ending exeats

#### Technical Notes:
- Uses `exeats` table with `daterange` period column
- Status managed through enum: 'active', 'ended', 'cancelled'

### US-004: Today's Services Widget
**As an** Admin  
**I want to** see all services scheduled for today with their status  
**So that** I can monitor daily service completion

#### Acceptance Criteria:
- [ ] Display service type, time, and status
- [ ] Show attendance count for each service
- [ ] Display brief profile circles of attendees
- [ ] Service statuses: 'active', 'completed', 'canceled'

### US-005: Top Absentees Widget
**As an** Admin  
**I want to** see the top 5 students with most absences this month  
**So that** I can identify students needing attention

#### Acceptance Criteria:
- [ ] Display student profile circle, name, matric number
- [ ] Show absence count for current month
- [ ] Monthly tracking and reset

### US-006: Recent Admin Actions Widget
**As an** Admin  
**I want to** see recent actions by all admins  
**So that** I can track system activity

#### Acceptance Criteria:
- [ ] Display admin name, action type, recipient, date
- [ ] Track actions like: "approved exeat for [student]", "created service for [event]"
- [ ] Support both student and service recipients

#### Technical Notes:
- Uses `admin_actions` table with polymorphic references via `object_type` and `object_id`

---

## 2. SERVICES MANAGEMENT

### US-007: Create Service
**As an** Admin  
**I want to** create new services  
**So that** I can schedule chapel sessions

#### Acceptance Criteria:
- [ ] Service types: 'morning', 'evening', 'special'
- [ ] Required fields: type, date, time
- [ ] Optional service name (required for special services)
- [ ] System generates unique service ID

#### Technical Notes:
- Uses `services` table with `service_type` enum
- Links to `service_levels` for level-specific configurations

### US-008: Service Management Table
**As an** Admin  
**I want to** view and manage all services in a table  
**So that** I can efficiently organize chapel sessions

#### Acceptance Criteria:
- [ ] Display: service type, date, status, creating admin
- [ ] Hidden fields: service ID (copyable)
- [ ] Pagination for large datasets Strictly client side sorting
- [ ] Quick actions: copy ID, edit, view attendees, export attendance, cancel

#### Filter & Sort Requirements:
STRICTLY CLIENT SIDE SORTING
- [ ] Filter by: type, status, date range
- [ ] Quick sort by clicking date column header
- [ ] Search by service name
- [ ] Date picker for date range selection
- [ ] Status dropdown filter

### US-009: Service Export
**As an** Admin  
**I want to** export attendance data for services  
**So that** I can generate reports and external documentation

#### Acceptance Criteria:
- [ ] Export formats: CSV, Excel
- [ ] Include: student details, attendance status, timestamps
- [ ] Filter by service and date range

---

## 3. ABSENTEES MANAGEMENT

### US-010: Absentee Viewer
**As an** Admin  
**I want to** review and manage student absences  
**So that** I can handle attendance exceptions

#### Acceptance Criteria:
- [ ] Display table with: checkbox selection, student info, exemption status
- [ ] Include students on exeat (with exemption status)
- [ ] Bulk selection with state persistence across searches
- [ ] Quick actions: view history, manual clear (single/bulk)

#### Filter & Sort Requirements:
- [ ] Date picker for service selection
- [ ] Service type filter
- [ ] Export absentee list functionality
- [ ] Maintain selection state across filtering

#### Technical Notes:
- Uses `attendance_batch_versions` for absentee data
- `manual_overrides` table for admin interventions
- `exeats` table for exemption checking

---

## 4. STUDENT MANAGEMENT (Super Admin Only)

### US-011: Bulk Student Upload
**As a** Super Admin  
**I want to** upload multiple students via CSV/Excel  
**So that** I can efficiently register large batches

#### Acceptance Criteria:
- [ ] Support CSV and Excel formats
- [ ] Atomic operations (all or nothing)
- [ ] Detailed error logging for failed uploads
- [ ] Preview before final import

#### Technical Notes:
- Uses `upload_history` table for tracking
- `upload_errors` table for error details
- Links to `students` via `upload_batch_id`

### US-012: Individual Student Management
**As a** Super Admin  
**I want to** add and manage individual students  
**So that** I can handle special cases and corrections

#### Student Form Fields:
- [ ] First name, middle name, last name
- [ ] Matric number (unique identifier)
- [ ] Level (100, 200, 300, 400, 500)
- [ ] Student email, parent email, parent phone

#### Table Management:
- [ ] Display: student info, email, level, status
- [ ] Quick actions: view profile, edit, resume, delete
- [ ] Pagination and robust sorting
- [ ] Search by name, matric number, or email

---

## 5. WARNING LETTERS SYSTEM

### US-013: Warning Letter Generation
**As an** Admin  
**I want to** generate and manage warning letters  
**So that** I can notify students of attendance issues

#### Warning Rules:
- [ ] Trigger after >2 absences in a week
- [ ] Handle edge case: Multiple misses in same week don't duplicate warnings
- [ ] Status tracking: 'pending', 'sent'

#### Management Interface:
- [ ] Display: student, matric, miss count, status
- [ ] Quick actions: resend letter, view history
- [ ] Bulk operations: send all pending
- [ ] Export individual letters as PDF

#### Technical Notes:
- Uses `warning_weekly_snapshot` for weekly tracking
- `warning_letters` for historical record
- Email sent to both student and parent

---

## 6. EXEAT MANAGEMENT

### US-014: Exeat Creation
**As an** Admin  
**I want to** create exeats for students  
**So that** I can manage approved absences

#### Acceptance Criteria:
- [ ] Student selection with search functionality
- [ ] Start date and end date selection
- [ ] Optional reason field
- [ ] Status tracking: 'active', 'ended', 'cancelled'

### US-015: Exeat Management Table
**As an** Admin  
**I want to** view and manage all exeats  
**So that** I can track approved absences

#### Display Requirements:
- [ ] Student name and matric number
- [ ] Start date, end date, status
- [ ] Pagination and sorting capabilities
- [ ] Quick actions: view student profile

#### Filter & Sort:
- [ ] Filter by status
- [ ] Sort by student name
- [ ] Quick sort by start/end date (column headers)

---

## 7. ADMIN MANAGEMENT (Super Admin Only)

### US-016: Admin Account Creation
**As a** Super Admin  
**I want to** create admin accounts  
**So that** I can manage system access

#### Account Creation:
- [ ] Form fields: first name, middle name, last name, email, role
- [ ] Auto-generate secure passwords
- [ ] Skip email verification (auto-verified accounts)
- [ ] Role assignment: 'admin' or 'super_admin'

#### Technical Implementation:
- [ ] Use Supabase Admin API with Service Role Key
- [ ] Backend API endpoint for secure account creation
- [ ] Store role in user metadata or separate profiles table

### US-017: Admin Management Table
**As a** Super Admin  
**I want to** manage existing admin accounts  
**So that** I can maintain system security

#### Display Requirements:
- [ ] Admin name with email below
- [ ] Role display and management
- [ ] Quick actions: edit admin, promote to super admin, delete admin

---

## 8. ATTENDANCE UPLOAD SYSTEM

### US-018: Attendance File Upload
**As an** Admin  
**I want to** upload scanner reports for attendance processing  
**So that** I can digitize physical attendance records

#### Upload Process:
- [ ] Date picker for service selection
- [ ] Service dropdown (disabled if no services for selected date)
- [ ] File upload with format validation
- [ ] Atomic processing (all or nothing)

### US-019: Attendance Preview System
**As an** Admin  
**I want to** preview parsed attendance before final ingestion  
**So that** I can verify data accuracy

#### Preview Display:
- [ ] Service information (type, date, time)
- [ ] Student list with match status:
  - [ ] Matched students (found in system)
  - [ ] Unmatched scans (not in system)
- [ ] Clear status indicators for each record

#### Technical Notes:
- Uses `attendance_batch_versions` for versioned storage
- `scan_archives` for original file storage
- `issues` table for unmatched scan logging

### US-020: Upload History Tracking
**As an** Admin  
**I want to** track all upload attempts and their results  
**So that** I can monitor system reliability and debug issues

#### Tracking Requirements:
- [ ] Complete upload history with timestamps
- [ ] Success/failure status with error details
- [ ] File metadata (size, type, name)
- [ ] Processing statistics (records processed/failed/total)

### US-021: Issues Management
**As an** Admin  
**I want to** view and resolve upload issues  
**So that** I can handle data discrepancies

#### Issue Types:
- [ ] Student not registered
- [ ] Invalid matric number format
- [ ] Duplicate entries
- [ ] System processing errors

#### Resolution Interface:
- [ ] Issue details display
- [ ] Resolution tracking with admin attribution
- [ ] Status updates (resolved/unresolved)

---

## TECHNICAL IMPLEMENTATION NOTES

### Database Views Recommendations:
Create optimized views for dashboard statistics to avoid complex real-time calculations:

1. **daily_attendance_stats** - For today's metrics
2. **weekly_warning_summary** - For warning letter tracking  
3. **monthly_absence_leaders** - For top absentees widget
4. **exeat_status_summary** - For exeat tracking

### Performance Considerations:
- Implement pagination on all large tables
- Use database indexes on frequently queried columns
- Cache dashboard statistics with appropriate TTL
- Consider read replicas for reporting queries

### Security Requirements:
- Row Level Security (RLS) policies for all tables
- Admin role verification for all operations
- Audit logging for sensitive operations
- Secure file upload with virus scanning

### Data Integrity:
- Foreign key constraints maintained
- Atomic transactions for multi-table operations
- Data validation at both frontend and backend
- Regular backup schedules

---

## PRIORITY MATRIX

### High Priority (MVP):
- Dashboard core widgets
- Service creation and management
- Basic attendance upload
- Student management (Super Admin)
- Admin account management

### Medium Priority:
- Advanced filtering and sorting
- Warning letter system
- Exeat management
- Upload history and issues tracking

### Low Priority (Future Enhancement):
- Advanced analytics
- Email templates customization
- Bulk operations optimization
- API integrations