// Admin promotion API endpoint - POST /api/admins/[id]/promote
// PHASE 2: Promote admin to superadmin with comprehensive error handling

import { NextRequest } from 'next/server';
import { createRoute, executeQuery, ERROR_CODES } from '@/lib/routeFactory';
import { adminSchema } from '@/lib/validation/admins.schema';
import type { Admin } from '@/lib/types';

// POST /api/admins/[id]/promote - Promote admin to superadmin
export const POST = createRoute<Admin>(
  async (request, { params, supabase, auth }) => {
    const adminId = params?.id;

    if (!adminId) {
      return {
        error: true,
        message: 'Admin ID is required',
        code: ERROR_CODES.VALIDATION_ERROR
      };
    }

    const result = await executeQuery(async () => {
      // Check if admin exists and get current role
      const { data: existingAdmin, error: checkError } = await supabase
        .from('admins')
        .select('id, first_name, last_name, role')
        .eq('id', adminId)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return {
            error: true,
            message: 'Admin not found',
            code: ERROR_CODES.NOT_FOUND
          };
        }
        throw new Error(`Failed to check existing admin: ${checkError.message}`);
      }

      // Check if already superadmin
      if (existingAdmin.role === 'superadmin') {
        return {
          error: true,
          message: `${existingAdmin.first_name} ${existingAdmin.last_name} is already a superadmin`,
          code: ERROR_CODES.CONFLICT
        };
      }

      // Promote to superadmin
      const { data, error } = await supabase
        .from('admins')
        .update({ role: 'superadmin' })
        .eq('id', adminId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to promote admin: ${error.message}`);
      }

      // Validate response data
      const validatedAdmin = adminSchema.safeParse(data);
      if (!validatedAdmin.success) {
        throw new Error('Invalid admin data returned from database');
      }

      return validatedAdmin.data;
    }, 'POST /api/admins/[id]/promote');

    return result;
  },
  {
    requireAuth: true,
    requiredRole: 'superadmin' // Only superadmins can promote other admins
  }
);
