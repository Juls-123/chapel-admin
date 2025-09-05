// Admin CRUD API endpoints - GET (list) and POST (create)
// PHASE 2: Supabase integration with comprehensive error handling

import { NextRequest } from 'next/server';
import { createRoute, executeQuery, ERROR_CODES } from '@/lib/routeFactory';
import { adminSchema, adminCreateSchema } from '@/lib/validation/admins.schema';
import type { Admin } from '@/lib/types';
import type { z } from 'zod';

type AdminCreate = z.infer<typeof adminCreateSchema>;

// GET /api/admins - List all admins with pagination
export const GET = createRoute<Admin[]>(
  async (request, { supabase, auth }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    const result = await executeQuery(async () => {
      let query = supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      // Add search filter if provided
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Add pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch admins: ${error.message}`);
      }

      // Validate response data
      const validatedData = data?.map((admin: unknown) => {
        const validation = adminSchema.safeParse(admin);
        if (!validation.success) {
          console.warn('Invalid admin data from database:', validation.error);
          return null;
        }
        return validation.data;
      }).filter(Boolean) || [];

      return {
        admins: validatedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    }, 'GET /api/admins');

    return result;
  },
  {
    requireAuth: true,
    requiredRole: 'admin' // Both admin and superadmin can view
  }
);

// POST /api/admins - Create new admin
export const POST = createRoute<Admin>(
  async (request, { supabase, auth }) => {
    const body = await request.json();
    
    // Validate request body
    const validation = adminCreateSchema.safeParse(body);
    if (!validation.success) {
      return {
        error: true,
        message: 'Invalid admin data',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      };
    }

    const adminData: AdminCreate = validation.data;

    const result = await executeQuery(async () => {
      // Check if email already exists
      const { data: existingAdmin, error: checkError } = await supabase
        .from('admins')
        .select('email')
        .eq('email', adminData.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to check existing admin: ${checkError.message}`);
      }

      if (existingAdmin) {
        return {
          error: true,
          message: 'An admin with this email already exists',
          code: ERROR_CODES.CONFLICT
        };
      }

      // Create new admin
      const { data, error } = await supabase
        .from('admins')
        .insert([adminData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create admin: ${error.message}`);
      }

      // Validate response data
      const validatedAdmin = adminSchema.safeParse(data);
      if (!validatedAdmin.success) {
        throw new Error('Invalid admin data returned from database');
      }

      return validatedAdmin.data;
    }, 'POST /api/admins');

    return result;
  },
  {
    requireAuth: true,
    requiredRole: 'superadmin', // Only superadmins can create admins
    validateBody: adminCreateSchema
  }
);
