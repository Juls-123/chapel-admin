import type { Student, Service, Exeat, ManualClear, AttendanceRecord, WarningLetterSummary, RecentAction } from './types';

export const students: Student[] = [
  { id: 'S001', student_number: 'STU-001', full_name: 'Alice Johnson', email: 'alice.j@example.com' },
  { id: 'S002', student_number: 'STU-002', full_name: 'Bob Williams', email: 'bob.w@example.com' },
  { id: 'S003', student_number: 'STU-003', full_name: 'Charlie Brown', email: 'charlie.b@example.com' },
  { id: 'S004', student_number: 'STU-004', full_name: 'Diana Miller', email: 'diana.m@example.com' },
  { id: 'S005', student_number: 'STU-005', full_name: 'Ethan Davis', email: 'ethan.d@example.com' },
  { id: 'S006', student_number: 'STU-006', full_name: 'Fiona Garcia', email: 'fiona.g@example.com' },
];

export const services: Service[] = [
  { id: 'SVC001', date: new Date(new Date().setDate(new Date().getDate())), type: 'morning', status: 'completed', created_by: 'Admin A', created_at: new Date() },
  { id: 'SVC002', date: new Date(new Date().setDate(new Date().getDate())), type: 'evening', status: 'active', created_by: 'Admin B', created_at: new Date() },
  { id: 'SVC003', date: new Date(new Date().setDate(new Date().getDate() - 1)), type: 'morning', status: 'completed', created_by: 'Admin A', created_at: new Date() },
  { id: 'SVC004', date: new Date(new Date().setDate(new Date().getDate() + 1)), type: 'morning', status: 'upcoming', created_by: 'Admin C', created_at: new Date() },
  { id: 'SVC005', date: new Date(new Date().setDate(new Date().getDate() + 2)), type: 'special', name: 'Founder\'s Day', status: 'upcoming', created_by: 'Admin B', created_at: new Date() },
  { id: 'SVC006', date: new Date(new Date().setDate(new Date().getDate() - 5)), type: 'evening', status: 'cancelled', created_by: 'Admin A', created_at: new Date() },
];

export const exeats: Exeat[] = [
  { id: 'EXE001', student_id: 'S003', student_name: 'Charlie Brown', start_date: new Date(new Date().setDate(new Date().getDate() - 2)), end_date: new Date(new Date().setDate(new Date().getDate() + 3)), reason: 'Family event', status: 'active', approved_by: 'Admin A', created_at: new Date() },
  { id: 'EXE002', student_id: 'S005', student_name: 'Ethan Davis', start_date: new Date(new Date().setDate(new Date().getDate() + 5)), end_date: new Date(new Date().setDate(new Date().getDate() + 10)), reason: 'Medical appointment', status: 'upcoming', approved_by: 'Admin B', created_at: new Date() },
  { id: 'EXE003', student_id: 'S001', student_name: 'Alice Johnson', start_date: new Date(new Date().setDate(new Date().getDate() - 10)), end_date: new Date(new Date().setDate(new Date().getDate() - 5)), reason: 'Academic conference', status: 'past', approved_by: 'Admin A', created_at: new Date() },
];

export const manualClears: ManualClear[] = [
  { id: 'MC001', student_id: 'S002', service_id: 'SVC001', cleared_by: 'Admin B', reason: 'Technical issue with scanner', created_at: new Date() },
];

export const attendanceRecords: AttendanceRecord[] = [
  ...students.map((student, index) => ({
    id: `ATT${index}`,
    student_id: student.id,
    student_name: student.full_name,
    service_id: 'SVC001',
    service_name: 'Morning Service',
    scanned_at: new Date(),
    status: index % 2 === 0 ? 'present' : ('absent' as 'present' | 'absent'),
    exemption_reason: undefined,
  })),
  { id: 'ATTX1', student_id: 'S003', student_name: 'Charlie Brown', service_id: 'SVC001', service_name: 'Morning Service', scanned_at: new Date(), status: 'exempted', exemption_reason: 'exeat' },
  { id: 'ATTX2', student_id: 'S002', student_name: 'Bob Williams', service_id: 'SVC001', service_name: 'Morning Service', scanned_at: new Date(), status: 'exempted', exemption_reason: 'manual_clear' },
];

export const warningLetterSummaries: WarningLetterSummary[] = [
  { student_id: 'S002', student_name: 'Bob Williams', week_start: new Date(new Date().setDate(new Date().getDate() - 7)), miss_count: 3, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 6)), new Date(new Date().setDate(new Date().getDate() - 4))], status: 'pending' },
  { student_id: 'S004', student_name: 'Diana Miller', week_start: new Date(new Date().setDate(new Date().getDate() - 7)), miss_count: 2, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 5))], status: 'sent' },
  { student_id: 'S006', student_name: 'Fiona Garcia', week_start: new Date(new Date().setDate(new Date().getDate() - 14)), miss_count: 4, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 12))], status: 'failed' },
  { student_id: 'S001', student_name: 'Alice Johnson', week_start: new Date(new Date().setDate(new Date().getDate() - 7)), miss_count: 2, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 3))], status: 'overridden' },
];

export const recentActions: RecentAction[] = [
    { id: 'ACT001', admin_name: 'Admin B', action: 'Approved Exeat for', target: 'Charlie Brown', date: new Date(new Date().setHours(new Date().getHours() - 1)) },
    { id: 'ACT002', admin_name: 'Admin A', action: 'Created Service', target: 'Founder\'s Day', date: new Date(new Date().setHours(new Date().getHours() - 3)) },
    { id: 'ACT003', admin_name: 'Admin C', action: 'Manually Cleared', target: 'Bob Williams', date: new Date(new Date().setHours(new Date().getHours() - 5)) },
    { id: 'ACT004', admin_name: 'Admin B', action: 'Cancelled Service', target: 'Evening Prayer', date: new Date(new Date().setDate(new Date().getDate() - 1)) },
];
