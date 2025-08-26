import type { Student, Service, Exeat, ManualClear, AttendanceRecord, WarningLetterSummary, RecentAction } from './types';

export const students: Student[] = [
  { id: 'S001', matric_number: 'STU-001', full_name: 'Adewale Adebayo', email: 'adewale.adebayo@mtu.edu.ng', status: 'active', level: 400, parents_phone_number: '08012345671' },
  { id: 'S002', matric_number: 'STU-002', full_name: 'Chidinma Okoro', email: 'chidinma.okoro@mtu.edu.ng', status: 'active', level: 200, parents_phone_number: '08012345672' },
  { id: 'S003', matric_number: 'STU-003', full_name: 'Bolanle Adeyemi', email: 'bolanle.adeyemi@mtu.edu.ng', status: 'paused', level: 300, parents_phone_number: '08012345673' },
  { id: 'S004', matric_number: 'STU-004', full_name: 'Emeka Okafor', email: 'emeka.okafor@mtu.edu.ng', status: 'active', level: 100, parents_phone_number: '08012345674' },
  { id: 'S005', matric_number: 'STU-005', full_name: 'Fatima Bello', email: 'fatima.bello@mtu.edu.ng', status: 'active', level: 500, parents_phone_number: '08012345675' },
  { id: 'S006', matric_number: 'STU-006', full_name: 'Oluwaseun Adekunle', email: 'oluwaseun.adekunle@mtu.edu.ng', status: 'active', level: 400, parents_phone_number: '08012345676' },
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
  { id: 'EXE001', matric_number: 'STU-003', student_name: 'Bolanle Adeyemi', start_date: new Date(new Date().setDate(new Date().getDate() - 2)), end_date: new Date(new Date().setDate(new Date().getDate() + 3)), reason: 'Family event', status: 'active', approved_by: 'Admin A', created_at: new Date() },
  { id: 'EXE002', matric_number: 'STU-005', student_name: 'Fatima Bello', start_date: new Date(new Date().setDate(new Date().getDate() + 5)), end_date: new Date(new Date().setDate(new Date().getDate() + 10)), reason: 'Medical appointment', status: 'upcoming', approved_by: 'Admin B', created_at: new Date() },
  { id: 'EXE003', matric_number: 'STU-001', student_name: 'Adewale Adebayo', start_date: new Date(new Date().setDate(new Date().getDate() - 10)), end_date: new Date(new Date().setDate(new Date().getDate() - 5)), reason: 'Academic conference', status: 'past', approved_by: 'Admin A', created_at: new Date() },
];

export const manualClears: ManualClear[] = [
  { id: 'MC001', matric_number: 'STU-002', service_id: 'SVC001', cleared_by: 'Admin B', reason: 'Technical issue with scanner', created_at: new Date() },
];

export const attendanceRecords: AttendanceRecord[] = [
  ...students.map((student, index) => ({
    id: `ATT${index}`,
    matric_number: student.matric_number,
    student_name: student.full_name,
    service_id: 'SVC001',
    service_name: 'Morning Service',
    scanned_at: new Date(),
    status: index % 2 === 0 ? 'present' : ('absent' as 'present' | 'absent'),
    exemption_reason: undefined,
  })),
  { id: 'ATTX1', matric_number: 'STU-003', student_name: 'Bolanle Adeyemi', service_id: 'SVC001', service_name: 'Morning Service', scanned_at: new Date(), status: 'exempted', exemption_reason: 'exeat' },
  { id: 'ATTX2', matric_number: 'STU-002', student_name: 'Chidinma Okoro', service_id: 'SVC001', service_name: 'Morning Service', scanned_at: new Date(), status: 'exempted', exemption_reason: 'manual_clear' },
];

export const warningLetterSummaries: WarningLetterSummary[] = [
  { matric_number: 'STU-002', student_name: 'Chidinma Okoro', week_start: new Date(new Date().setDate(new Date().getDate() - 7)), miss_count: 3, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 6)), new Date(new Date().setDate(new Date().getDate() - 4))], status: 'pending' },
  { matric_number: 'STU-004', student_name: 'Emeka Okafor', week_start: new Date(new Date().setDate(new Date().getDate() - 7)), miss_count: 2, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 5))], status: 'sent' },
  { matric_number: 'STU-006', student_name: 'Oluwaseun Adekunle', week_start: new Date(new Date().setDate(new Date().getDate() - 14)), miss_count: 4, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 12))], status: 'failed' },
  { matric_number: 'STU-001', student_name: 'Adewale Adebayo', week_start: new Date(new Date().setDate(new Date().getDate() - 7)), miss_count: 2, missed_service_dates: [new Date(new Date().setDate(new Date().getDate() - 3))], status: 'overridden' },
];

export const recentActions: RecentAction[] = [
    { id: 'ACT001', admin_name: 'Admin B', action: 'Approved Exeat for', target: 'Bolanle Adeyemi', date: new Date(new Date().setHours(new Date().getHours() - 1)) },
    { id: 'ACT002', admin_name: 'Admin A', action: 'Created Service', target: 'Founder\'s Day', date: new Date(new Date().setHours(new Date().getHours() - 3)) },
    { id: 'ACT003', admin_name: 'Admin C', action: 'Manually Cleared', target: 'Chidinma Okoro', date: new Date(new Date().setHours(new Date().getHours() - 5)) },
    { id: 'ACT004', admin_name: 'Admin B', action: 'Cancelled Service', target: 'Evening Prayer', date: new Date(new Date().setDate(new Date().getDate() - 1)) },
];
