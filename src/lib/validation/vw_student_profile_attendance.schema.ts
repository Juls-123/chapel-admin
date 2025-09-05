// Generated from /docs/schemas/schema-v1-updates.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

// View schema for student profile with attendance data
export const vwStudentProfileAttendanceSchema = z.object({
  student_id: z.string().uuid(),
  matric_number: z.string(),
  first_name: z.string(),
  middle_name: z.string().optional(),
  last_name: z.string(),
  full_name: z.string().optional(),
  level_id: z.string().uuid().optional(),
  service_id: z.string().uuid().optional(),
  service_name: z.string().optional(),
  service_date: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }).optional(),
  total_present: z.number().int().default(0),
  total_absent: z.number().int().default(0),
  total_exempted: z.number().int().default(0)
});

export type VwStudentProfileAttendance = z.infer<typeof vwStudentProfileAttendanceSchema>;

// Validation test (Node.js only)
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const testProfileData = {
    student_id: '7a8b9cde-aaaa-bbbb-cccc-0123456789ab',
    matric_number: 'STU-001',
    first_name: 'Jane',
    last_name: 'Doe',
    full_name: 'Jane Doe',
    level_id: '8c9d0eff-bbbb-cccc-dddd-0123456789cd',
    service_id: '9d0e1f23-cccc-dddd-eeee-0123456789ef',
    service_name: 'Sunday Morning Service',
    service_date: '2024-01-07',
    total_present: 1,
    total_absent: 0,
    total_exempted: 0
  };
  console.log('Student profile attendance schema validation:', vwStudentProfileAttendanceSchema.safeParse(testProfileData));
}
