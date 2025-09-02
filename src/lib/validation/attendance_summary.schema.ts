// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const attendanceSummarySchema = z.object({
  id: z.string().uuid(),
  service_id: z.string().uuid(),
  level_id: z.string().uuid(),
  total_students: z.number().int(),
  total_present: z.number().int(),
  total_absent: z.number().int(),
  total_exempted: z.number().int(), // students with valid exeats
  total_unmatched: z.number().int(), // scans that couldn't match to students
  generated_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' })
});

export const attendanceSummaryCreateSchema = attendanceSummarySchema.omit({ 
  id: true, 
  generated_at: true 
});

export const attendanceSummaryUpdateSchema = attendanceSummaryCreateSchema.partial();

export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>;
export type AttendanceSummaryCreate = z.infer<typeof attendanceSummaryCreateSchema>;
export type AttendanceSummaryUpdate = z.infer<typeof attendanceSummaryUpdateSchema>;

// Validation test
if (require.main === module) {
  const testSummary = {
    id: 'c0345678-ffff-aaaa-bbbb-0123456789de',
    service_id: '9d0e1f23-cccc-dddd-eeee-0123456789ef',
    level_id: '8c9d0eff-bbbb-cccc-dddd-0123456789cd',
    total_students: 100,
    total_present: 85,
    total_absent: 10,
    total_exempted: 5,
    total_unmatched: 0,
    generated_at: new Date().toISOString()
  };
  console.log('Attendance summary schema validation:', attendanceSummarySchema.safeParse(testSummary));
}
