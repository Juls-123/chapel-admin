// Admin CRUD API endpoints - GET (single), PUT (update), DELETE
// PHASE 2: Supabase integration with comprehensive error handling

import { NextRequest } from 'next/server';
import { createRoute, executeQuery, ERROR_CODES } from '@/lib/routeFactory';
import { adminSchema, adminUpdateSchema } from '@/lib/validation/admins.schema';
import type { Admin } from '@/lib/types';
import type { z } from 'zod';

type AdminUpdate = z.infer<typeof adminUpdateSchema>;

// GET /api/admins/[id] - Get single admin
export const GET = createRoute<Admin>(
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
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', adminId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: true,
            message: 'Admin not found',
            code: ERROR_CODES.NOT_FOUND
          };
        }
        throw new Error(`Failed to fetch admin: ${error.message}`);
      }

      // Validate response data
      const validation = adminSchema.safeParse(data);
      if (!validation.success) {
        throw new Error('Invalid admin data from database');
      }

      return validation.data;
    }, 'GET /api/admins/[id]');

    return result;
  },
  {
    requireAuth: true,
    requiredRole: 'admin'
  }
);

// PUT /api/admins/[id] - Update admin
export const PUT = createRoute<Admin>(
  async (request, { params, supabase, auth }) => {
    const adminId = params?.id;

    if (!adminId) {
      return {
        error: true,
        message: 'Admin ID is required',
        code: ERROR_CODES.VALIDATION_ERROR
      };
    }

    const body = await request.json();
    
    // Validate request body
    const validation = adminUpdateSchema.safeParse(body);
    if (!validation.success) {
      return {
        error: true,
        message: 'Invalid admin data',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      };
    }

    const updateData: AdminUpdate = validation.data;

    const result = await executeQuery(async () => {
      // Check if admin exists
      const { data: existingAdmin, error: checkError } = await supabase
        .from('admins')
        .select('id, email')
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

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingAdmin.email) {
        const { data: emailCheck, error: emailError } = await supabase
          .from('admins')
          .select('id')
          .eq('email', updateData.email)
          .neq('id', adminId)
          .single();

        if (emailError && emailError.code !== 'PGRST116') {
          throw new Error(`Failed to check email uniqueness: ${emailError.message}`);
        }

        if (emailCheck) {
          return {
            error: true,
            message: 'An admin with this email already exists',
            code: ERROR_CODES.CONFLICT
          };
        }
      }

      // Update admin
      const { data, error } = await supabase
        .from('admins')
        .update(updateData)
        .eq('id', adminId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update admin: ${error.message}`);
      }

      // Validate response data
      const validatedAdmin = adminSchema.safeParse(data);
      if (!validatedAdmin.success) {
        throw new Error('Invalid admin data returned from database');
      }

      return validatedAdmin.data;
    }, 'PUT /api/admins/[id]');

    return result;
  },
  {
    requireAuth: true,
    requiredRole: 'superadmin', // Only superadmins can update admins
    validateBody: adminUpdateSchema
  }
);

// DELETE /api/admins/[id] - Delete admin
export const DELETE = createRoute<{ message: string }>(
  async (request, { params, supabase, auth }) => {
    const adminId = params?.id;

    if (!adminId) {
      return {
        error: true,
        message: 'Admin ID is required',
        code: ERROR_CODES.VALIDATION_ERROR
      };
    }

    // Prevent self-deletion
    if (auth.user?.id === adminId) {
      return {
        error: true,
        message: 'Cannot delete your own account',
        code: ERROR_CODES.FORBIDDEN
      };
    }

    const result = await executeQuery(async () => {
      // Check if admin exists
      const { data: existingAdmin, error: checkError } = await supabase
        .from('admins')
        .select('id, first_name, last_name')
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

      // Delete admin
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (error) {
        throw new Error(`Failed to delete admin: ${error.message}`);
      }

      return {
        message: `Admin ${existingAdmin.first_name} ${existingAdmin.last_name} has been deleted successfully`
      };
    }, 'DELETE /api/admins/[id]');

    return result;
  },
  {
    requireAuth: true,
    requiredRole: 'superadmin' // Only superadmins can delete admins
  }
);
