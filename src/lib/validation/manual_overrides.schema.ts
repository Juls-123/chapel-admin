// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

// Enum from database
export const overrideReasonEnum = z.enum(['late_exeat', 'scanning_error', 'manual_correction', 'permission', 'other']);

export const manualOverrideSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid().optional(),
  service_id: z.string().uuid().optional(),
  level_id: z.string().uuid().optional(),
  overridden_by: z.string().uuid().optional(),
  reason: overrideReasonEnum,
  note: z.string().optional(),
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' })
});

export const manualOverrideCreateSchema = manualOverrideSchema.omit({ 
  id: true, 
  created_at: true 
});

export const manualOverrideUpdateSchema = manualOverrideCreateSchema.partial();

export type ManualOverride = z.infer<typeof manualOverrideSchema>;
export type ManualOverrideCreate = z.infer<typeof manualOverrideCreateSchema>;
export type ManualOverrideUpdate = z.infer<typeof manualOverrideUpdateSchema>;
export type OverrideReason = z.infer<typeof overrideReasonEnum>;

// Validation test
if (require.main === module) {
  const testOverride = {
    id: 'b5890123-eeee-ffff-aaaa-0123456789fd',
    student_id: '7a8b9cde-aaaa-bbbb-cccc-0123456789ab',
    service_id: '9d0e1f23-cccc-dddd-eeee-0123456789ef',
    reason: 'scanning_error' as const,
    note: 'Scanner malfunction during service',
    created_at: new Date().toISOString()
  };
  console.log('Manual override schema validation:', manualOverrideSchema.safeParse(testOverride));
}
