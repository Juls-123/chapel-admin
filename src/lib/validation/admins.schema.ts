// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

// Enums from database
export const roleEnum = z.enum(['admin', 'superadmin']);

export const adminSchema = z.object({
  id: z.string().uuid(),
  auth_user_id: z.string().uuid().optional(), // optional link to supabase auth.users
  first_name: z.string(),
  middle_name: z.string().optional(),
  last_name: z.string(),
  email: z.string().email(), // UNIQUE constraint
  role: roleEnum.default('admin'),
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' })
});

export const adminCreateSchema = adminSchema.omit({ 
  id: true, 
  created_at: true 
});

export const adminUpdateSchema = adminCreateSchema.partial();

export type Admin = z.infer<typeof adminSchema>;
export type AdminCreate = z.infer<typeof adminCreateSchema>;
export type AdminUpdate = z.infer<typeof adminUpdateSchema>;
export type Role = z.infer<typeof roleEnum>;

// Validation test - removed for Next.js compatibility
// if (require.main === module) {
//   const testAdmin = {
//     id: 'ae1f2345-dddd-eeee-ffff-0123456789ab',
//     first_name: 'John',
//     last_name: 'Admin',
//     email: 'john.admin@chapel.edu',
//     role: 'admin' as const,
//     created_at: new Date().toISOString()
//   };
//   console.log('Admin schema validation:', adminSchema.safeParse(testAdmin));
// }
