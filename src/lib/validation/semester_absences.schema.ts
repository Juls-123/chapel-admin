// Generated from /docs/schemas/schema-v1-updates.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const semesterAbsenceSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  semester_id: z.string().uuid(),
  total_absences: z.number().int().default(0),
  updated_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' })
});

export const semesterAbsenceCreateSchema = semesterAbsenceSchema.omit({ 
  id: true, 
  updated_at: true 
});

export const semesterAbsenceUpdateSchema = semesterAbsenceCreateSchema.partial();

export type SemesterAbsence = z.infer<typeof semesterAbsenceSchema>;
export type SemesterAbsenceCreate = z.infer<typeof semesterAbsenceCreateSchema>;
export type SemesterAbsenceUpdate = z.infer<typeof semesterAbsenceUpdateSchema>;

// Validation test
if (require.main === module) {
  const testSemesterAbsence = {
    id: 'f3678901-cccc-dddd-eeee-0123456789fb',
    student_id: '7a8b9cde-aaaa-bbbb-cccc-0123456789ab',
    semester_id: 'bf234567-eeee-ffff-aaaa-0123456789cd',
    total_absences: 3,
    updated_at: new Date().toISOString()
  };
  console.log('Semester absence schema validation:', semesterAbsenceSchema.safeParse(testSemesterAbsence));
}
