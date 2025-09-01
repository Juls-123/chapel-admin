import type { Student, Service, Exeat, ManualClear, AttendanceRecord, WarningLetterSummary, RecentAction, Admin, ManualClearReason, ServiceConstraint } from './types';

export const students: Student[] = [
  { id: 'S001', matric_number: 'STU-001', first_name: 'Adewale', middle_name: 'Chukwuebuka', last_name: 'Adebayo', email: 'adewale.adebayo@mtu.edu.ng', parents_email: 'parent.adebayo@example.com', status: 'active', level: 400, parents_phone_number: '08012345671' },
  { id: 'S002', matric_number: 'STU-002', first_name: 'Chidinma', middle_name: 'Afolabi', last_name: 'Okoro', email: 'chidinma.okoro@mtu.edu.ng', parents_email: 'parent.okoro@example.com', status: 'active', level: 200, parents_phone_number: '08012345672' },
  { id: 'S003', matric_number: 'STU-003', first_name: 'Bolanle', middle_name: 'Ngozi', last_name: 'Adeyemi', email: 'bolanle.adeyemi@mtu.edu.ng', parents_email: 'parent.adeyemi@example.com', status: 'paused', level: 300, parents_phone_number: '08012345673' },
  { id: 'S004', matric_number: 'STU-004', first_name: 'Emeka', middle_name: 'Oluwafemi', last_name: 'Okafor', email: 'emeka.okafor@mtu.edu.ng', parents_email: 'parent.okafor@example.com', status: 'active', level: 100, parents_phone_number: '08012345674' },
  { id: 'S005', matric_number: 'STU-005', first_name: 'Fatima', middle_name: 'Abisola', last_name: 'Bello', email: 'fatima.bello@mtu.edu.ng', parents_email: 'parent.bello@example.com', status: 'active', level: 500, parents_phone_number: '08012345675' },
  { id: 'S006', matric_number: 'STU-006', first_name: 'Oluwaseun', middle_name: 'Ikenna', last_name: 'Adekunle', email: 'oluwaseun.adekunle@mtu.edu.ng', parents_email: 'parent.adekunle@example.com', status: 'active', level: 400, parents_phone_number: '08012345676' },
];

const getFullName = (student: Student) => `${student.first_name} ${student.middle_name} ${student.last_name}`;

export const services: Service[] = [
  { id: 'SVC001', date: new Date(new Date().setDate(new Date().getDate())), type: 'morning', status: 'completed', created_by: 'Admin A', created_at: new Date(), applicable_levels: [100,200,300,400,500] },
  { id: 'SVC002', date: new Date(new Date().setDate(new Date().getDate())), type: 'evening', status: 'active', created_by: 'Admin B', created_at: new Date(), applicable_levels: [100,200,300,400,500] },
  { id: 'SVC003', date: new Date(new Date().setDate(new Date().getDate() - 1)), type: 'morning', status: 'completed', created_by: 'Admin A', created_at: new Date(), applicable_levels: [100,200,300,400,500] },
  { id: 'SVC004', date: new Date(new Date().setDate(new Date().getDate() + 1)), type: 'morning', status: 'upcoming', created_by: 'Admin C', created_at: new Date(), applicable_levels: [300,400,500] },
  { id: 'SVC005', date: new Date(new Date().setDate(new Date().getDate() + 2)), type: 'special', name: 'Founder\'s Day', status: 'upcoming', created_by: 'Admin B', created_at: new Date(), constraint: 'all' },
  { id: 'SVC006', date: new Date(new Date().setDate(new Date().getDate() - 5)), type: 'evening', status: 'cancelled', created_by: 'Admin A', created_at: new Date() },
];

export const exeats: Exeat[] = [
  { id: 'EXE001', matric_number: 'STU-003', student_name: getFullName(students[2]), start_date: new Date(new Date().setDate(new Date().getDate() - 2)), end_date: new Date(new Date().setDate(new Date().getDate() + 3)), reason: 'Family event', status: 'active', approved_by: 'Admin A', created_at: new Date() },
  { id: 'EXE002', matric_number: 'STU-005', student_name: getFullName(students[4]), start_date: new Date(new Date().setDate(new Date().getDate() + 5)), end_date: new Date(new Date().setDate(new Date().getDate() + 10)), reason: 'Medical appointment', status: 'upcoming', approved_by: 'Admin B', created_at: new Date() },
  { id: 'EXE003', matric_number: 'STU-001', student_name: getFullName(students[0]), start_date: new Date(new Date().setDate(new Date().getDate() - 10)), end_date: new Date(new Date().setDate(new Date().getDate() - 5)), reason: 'Academic conference', status: 'past', approved_by: 'Admin A', created_at: new Date() },
];

export const manualClears: ManualClear[] = [
  { id: 'MC001', matric_number: 'STU-002', service_id: 'SVC001', cleared_by: 'Admin B', reason: 'Technical issue with scanner', created_at: new Date() },
];

export const attendanceRecords: AttendanceRecord[] = [
  ...students.map((student, index) => ({
    id: `ATT${index}`,
    matric_number: student.matric_number,
    student_name: getFullName(student),
    service_id: 'SVC001',
    service_name: 'Morning Service',
    scanned_at: new Date(),
    status: index % 2 === 0 ? 'present' : ('absent' as 'present' | 'absent'),
    exemption_reason: undefined,
  })),
  { id: 'ATTX1', matric_number: 'STU-003', student_name: getFullName(students[2]), service_id: 'SVC001', service_name: 'Morning Service', scanned_at: new Date(), status: 'exempted', exemption_reason: 'exeat' },
  { id: 'ATTX2', matric_number: 'STU-002', student_name: getFullName(students[1]), service_id: 'SVC001', service_name: 'Morning Service', scanned_at: new Date(), status: 'exempted', exemption_reason: 'manual_clear' },
  ...students.slice(0,3).map((student, index) => ({
    id: `ATT2-${index}`,
    matric_number: student.matric_number,
    student_name: getFullName(student),
    service_id: 'SVC002',
    service_name: 'Evening Service',
    scanned_at: new Date(),
    status: 'present',
    exemption_reason: undefined,
  }))
];

export const warningLetterSummaries: WarningLetterSummary[] = [
  { matric_number: 'STU-002', student_name: getFullName(students[1]), week_start: new Date(new Date().setDate(new Date().getDate() - 7)), miss_count: 3, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 6)), new Date(new Date().setDate(new Date().getDate() - 4))], status: 'pending' },
  { matric_number: 'STU-004', student_name: getFullName(students[3]), week_start: new Date(new Date().setDate(new Date().getDate() - 7)), miss_count: 2, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 5))], status: 'sent' },
  { matric_number: 'STU-006', student_name: getFullName(students[5]), week_start: new Date(new Date().setDate(new Date().getDate() - 14)), miss_count: 4, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 12))], status: 'failed' },
  { matric_number: 'STU-001', student_name: getFullName(students[0]), week_start: new Date(new Date().setDate(new Date().getDate() - 7)), miss_count: 2, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 3))], status: 'pending' },
];

export const recentActions: RecentAction[] = [
    { id: 'ACT001', admin_name: 'Admin B', action: 'Approved Exeat for', target: getFullName(students[2]), description: "Approved for 'Family event'", date: new Date(new Date().setHours(new Date().getHours() - 1)) },
    { id: 'ACT002', admin_name: 'Admin A', action: 'Created Service', target: 'Founder\'s Day', description: "Scheduled for upcoming special event.", date: new Date(new Date().setHours(new Date().getHours() - 3)) },
    { id: 'ACT003', admin_name: 'Admin C', action: 'Manually Cleared', target: getFullName(students[1]), description: "Cleared for Morning Service due to scanner issue.", date: new Date(new Date().setHours(new Date().getHours() - 5)) },
    { id: 'ACT004', admin_name: 'Admin B', action: 'Cancelled Service', target: 'Evening Prayer', description: "Cancelled due to university-wide power outage.", date: new Date(new Date().setDate(new Date().getDate() - 1)) },
];

export const admins: Admin[] = [
  { id: 'ADM001', first_name: 'Super', middle_name: 'Admin', last_name: 'User', email: 'super.admin@chapel.co', role: 'superadmin' },
  { id: 'ADM002', first_name: 'Jane', middle_name: 'Ima', last_name: 'Smith', email: 'jane.smith@chapel.co', role: 'admin' },
  { id: 'ADM003', first_name: 'John', middle_name: 'Ade', last_name: 'Doe', email: 'john.doe@chapel.co', role: 'admin' },
];

// This simulates the currently logged-in user.
export const currentAdmin: Admin = admins[0]; // Currently logged in as a superadmin

export const manualClearReasons: ManualClearReason[] = [
    { id: 'MCR001', reason: 'Student not in registry', created_by: 'Super Admin User', created_at: new Date() },
    { id: 'MCR002', reason: 'Scanner malfunction', created_by: 'Super Admin User', created_at: new Date() },
    { id: 'MCR003', reason: 'Verified manual entry', created_by: 'Super Admin User', created_at: new Date() },
];

export const serviceConstraints: ServiceConstraint[] = [
    { id: 'SC001', name: 'All Levels Must Attend', description: 'This service is mandatory for all students regardless of level.', created_by: 'Super Admin User', created_at: new Date() },
    { id: 'SC002', name: 'No Level Restriction', description: 'This service is open to all, but not mandatory for any specific level.', created_by: 'Super Admin User', created_at: new Date() },
];
