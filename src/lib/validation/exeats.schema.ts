// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const exeatSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  start_date: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }),
  end_date: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }),
  reason: z.string().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' }),
  status: z.enum(['active', 'ended', 'cancelled']).default('active'),
  period: z.string().optional() // Generated daterange column - stored as string representation
});

export const exeatCreateSchema = exeatSchema.omit({ 
  id: true, 
  created_at: true,
  period: true 
});

export const exeatUpdateSchema = exeatCreateSchema.partial();

export type Exeat = z.infer<typeof exeatSchema>;
export type ExeatCreate = z.infer<typeof exeatCreateSchema>;
export type ExeatUpdate = z.infer<typeof exeatUpdateSchema>;

// Validation test
if (require.main === module) {
  const testExeat = {
    id: 'd1456789-aaaa-bbbb-cccc-0123456789ef',
    student_id: '7a8b9cde-aaaa-bbbb-cccc-0123456789ab',
    start_date: '2024-01-15',
    end_date: '2024-01-20',
    reason: 'Medical appointment',
    status: 'active' as const,
    created_at: new Date().toISOString()
  };
  console.log('Exeat schema validation:', exeatSchema.safeParse(testExeat));
}
