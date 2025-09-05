// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

// Schema matching database structure exactly
export const levelSchema = z.object({
  id: z.string().uuid(),
  code: z.string(), // text field in DB
  name: z.string().nullable(), // text null in DB
  created_at: z.string().nullable(), // timestamp with time zone null in DB
});

export type Level = z.infer<typeof levelSchema>;

// No create/update schemas needed since levels are not created via API
// Validation test (Node.js only - skip in browser/Next.js)
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const testLevel = {
    id: '8c9d0eff-bbbb-cccc-dddd-0123456789cd',
    code: '100',
    name: '100 Level',
    created_at: new Date().toISOString()
  };
  console.log('Level schema validation:', levelSchema.safeParse(testLevel));
}
