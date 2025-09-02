// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const serviceConstraintDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(), // "Male Only", "Female Only", "Final Year Only" - UNIQUE constraint
  constraint_rule: z.record(z.any()), // {"gender": "male"} or {"level_codes": ["400"]} - jsonb field
  description: z.string().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' }),
  is_active: z.boolean().default(true)
});

export const serviceConstraintDefinitionCreateSchema = serviceConstraintDefinitionSchema.omit({ 
  id: true, 
  created_at: true 
});

export const serviceConstraintDefinitionUpdateSchema = serviceConstraintDefinitionCreateSchema.partial();

export type ServiceConstraintDefinition = z.infer<typeof serviceConstraintDefinitionSchema>;
export type ServiceConstraintDefinitionCreate = z.infer<typeof serviceConstraintDefinitionCreateSchema>;
export type ServiceConstraintDefinitionUpdate = z.infer<typeof serviceConstraintDefinitionUpdateSchema>;

// Validation test
if (require.main === module) {
  const testConstraint = {
    id: 'd7012345-aaaa-bbbb-cccc-0123456789ff',
    name: 'Male Students Only',
    constraint_rule: { gender: 'male' },
    description: 'Service restricted to male students',
    is_active: true,
    created_at: new Date().toISOString()
  };
  console.log('Service constraint definition schema validation:', serviceConstraintDefinitionSchema.safeParse(testConstraint));
}
