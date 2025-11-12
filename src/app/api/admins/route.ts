// Admin CRUD API endpoints
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminSchema, adminCreateSchema } from '@/lib/validation/admins.schema';
import { requireAdmin } from '@/lib/api/auth';
import { buildResponse, handleApiError } from '@/lib/api/response';
import type { Admin } from '@/lib/types';
import type { z } from 'zod';

type AdminCreate = z.infer<typeof adminCreateSchema>;

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admins - List all admins with pagination
export async function GET(request: NextRequest) {
  try {
    // Require admin role
    const { admin } = await requireAdmin({ role: 'admin' });

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('admins')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // Add pagination
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch admins: ${error.message}`);
    }

    // If no data, return empty array with pagination
    if (!data) {
      return NextResponse.json({
        admins: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Validate response data
    const validatedData = (data || [])
      .map((admin) => {
        try {
          const validation = adminSchema.safeParse(admin);
          if (!validation.success) {
            console.warn('Invalid admin data from database:', validation.error);
            return null;
          }
          return validation.data;
        } catch (error) {
          console.error('Error validating admin data:', error);
          return null;
        }
      })
      .filter((admin): admin is Admin => admin !== null);

    // Calculate pagination
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Return response in the exact format expected by the frontend
    return NextResponse.json({
      admins: validatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    return handleApiError(error, 'admins.GET');
  }
}

// POST /api/admins - Create new admin
export async function POST(request: NextRequest) {
  try {
    // Require superadmin role
    const { admin } = await requireAdmin({ role: 'superadmin' });

    const body = await request.json();
    
    // Validate request body
    const validation = adminCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    const adminData: AdminCreate = validation.data;

    // Check if email already exists
    const { data: existingAdmin, error: checkError } = await supabaseAdmin
      .from('admins')
      .select('email')
      .eq('email', adminData.email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to check existing admin: ${checkError.message}`);
    }

    if (existingAdmin) {
      return NextResponse.json(
        {
          error: 'An admin with this email already exists',
          code: 'DUPLICATE_EMAIL'
        },
        { status: 409 }
      );
    }

    // Create new admin
    const { data, error: createError } = await supabaseAdmin
      .from('admins')
      .insert([adminData])
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create admin: ${createError.message}`);
    }

    // Validate response data
    const validatedAdmin = adminSchema.safeParse(data);
    if (!validatedAdmin.success) {
      throw new Error('Invalid admin data returned from database');
    }

    return NextResponse.json(
      buildResponse({ data: validatedAdmin.data }),
      { status: 201 }
    );

  } catch (error) {
    return handleApiError(error, 'admins.POST');
  }
}