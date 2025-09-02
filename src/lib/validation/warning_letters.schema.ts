// Generated from /docs/schemas/schema-v1-updates.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const warningLetterSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  level_id: z.string().uuid().optional(),
  warning_type: z.enum(['first', 'second', 'final']),
  issued_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' }),
  notes: z.string().optional()
});

export const warningLetterCreateSchema = warningLetterSchema.omit({ 
  id: true, 
  issued_at: true 
});

export const warningLetterUpdateSchema = warningLetterCreateSchema.partial();

export type WarningLetter = z.infer<typeof warningLetterSchema>;
export type WarningLetterCreate = z.infer<typeof warningLetterCreateSchema>;
export type WarningLetterUpdate = z.infer<typeof warningLetterUpdateSchema>;

// Validation test
if (require.main === module) {
  const testWarningLetter = {
    id: 'e2567890-bbbb-cccc-dddd-0123456789fa',
    student_id: '7a8b9cde-aaaa-bbbb-cccc-0123456789ab',
    warning_type: 'first' as const,
    issued_at: new Date().toISOString(),
    notes: 'Excessive absences in chapel services'
  };
  console.log('Warning letter schema validation:', warningLetterSchema.safeParse(testWarningLetter));
}
