// Generated from /docs/schemas/schema-v1-updates.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const semesterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  start_date: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }),
  end_date: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }),
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' })
});

export const semesterCreateSchema = semesterSchema.omit({ 
  id: true, 
  created_at: true 
});

export const semesterUpdateSchema = semesterCreateSchema.partial();

export type Semester = z.infer<typeof semesterSchema>;
export type SemesterCreate = z.infer<typeof semesterCreateSchema>;
export type SemesterUpdate = z.infer<typeof semesterUpdateSchema>;

// Validation test
if (require.main === module) {
  const testSemester = {
    id: 'bf234567-eeee-ffff-aaaa-0123456789cd',
    name: 'Fall 2024',
    start_date: '2024-09-01',
    end_date: '2024-12-15',
    created_at: new Date().toISOString()
  };
  console.log('Semester schema validation:', semesterSchema.safeParse(testSemester));
}
