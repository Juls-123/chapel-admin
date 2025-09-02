// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const specialServiceTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(), // "Founders Day Service", "Christmas Carol"
  suggested_levels: z.array(z.string()).default([]), // ["100", "200", "300", "400"]
  created_by: z.string().uuid().optional(),
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' }),
  is_active: z.boolean().default(true)
});

export const specialServiceTemplateCreateSchema = specialServiceTemplateSchema.omit({ 
  id: true, 
  created_at: true 
});

export const specialServiceTemplateUpdateSchema = specialServiceTemplateCreateSchema.partial();

export type SpecialServiceTemplate = z.infer<typeof specialServiceTemplateSchema>;
export type SpecialServiceTemplateCreate = z.infer<typeof specialServiceTemplateCreateSchema>;
export type SpecialServiceTemplateUpdate = z.infer<typeof specialServiceTemplateUpdateSchema>;

// Validation test
if (require.main === module) {
  const testTemplate = {
    id: 'f9234567-cccc-dddd-eeee-0123456789bb',
    name: 'Founders Day Service',
    suggested_levels: ['100', '200', '300', '400'],
    is_active: true,
    created_at: new Date().toISOString()
  };
  console.log('Special service template schema validation:', specialServiceTemplateSchema.safeParse(testTemplate));
}
