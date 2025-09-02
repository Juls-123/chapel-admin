// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const levelSchema = z.object({
  id: z.string().uuid(),
  code: z.string(), // "100", "200", "300", "400" - UNIQUE constraint
  name: z.string().optional(), // optional display name
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' })
});

export const levelCreateSchema = levelSchema.omit({ 
  id: true, 
  created_at: true 
});

export const levelUpdateSchema = levelCreateSchema.partial();

export type Level = z.infer<typeof levelSchema>;
export type LevelCreate = z.infer<typeof levelCreateSchema>;
export type LevelUpdate = z.infer<typeof levelUpdateSchema>;

// Validation test
if (require.main === module) {
  const testLevel = {
    id: '8c9d0eff-bbbb-cccc-dddd-0123456789cd',
    code: '100',
    name: '100 Level',
    created_at: new Date().toISOString()
  };
  console.log('Level schema validation:', levelSchema.safeParse(testLevel));
}
