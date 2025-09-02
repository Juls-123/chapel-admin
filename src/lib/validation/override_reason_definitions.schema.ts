// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const overrideReasonDefinitionSchema = z.object({
  id: z.string().uuid(),
  code: z.string(), // maps to override_reason enum values - UNIQUE constraint
  display_name: z.string(), // "Late Exeat Submission"
  description: z.string().optional(),
  requires_note: z.boolean().default(false), // force admin to add explanation
  created_by: z.string().uuid().optional(),
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' }),
  is_active: z.boolean().default(true)
});

export const overrideReasonDefinitionCreateSchema = overrideReasonDefinitionSchema.omit({ 
  id: true, 
  created_at: true 
});

export const overrideReasonDefinitionUpdateSchema = overrideReasonDefinitionCreateSchema.partial();

export type OverrideReasonDefinition = z.infer<typeof overrideReasonDefinitionSchema>;
export type OverrideReasonDefinitionCreate = z.infer<typeof overrideReasonDefinitionCreateSchema>;
export type OverrideReasonDefinitionUpdate = z.infer<typeof overrideReasonDefinitionUpdateSchema>;

// Validation test
if (require.main === module) {
  const testReasonDef = {
    id: 'e8123456-bbbb-cccc-dddd-0123456789aa',
    code: 'late_exeat',
    display_name: 'Late Exeat Submission',
    description: 'Exeat was submitted after absence was recorded',
    requires_note: true,
    is_active: true,
    created_at: new Date().toISOString()
  };
  console.log('Override reason definition schema validation:', overrideReasonDefinitionSchema.safeParse(testReasonDef));
}
