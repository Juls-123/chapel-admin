// Admin CRUD API endpoints - GET (single), PUT (update), DELETE
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminSchema, adminUpdateSchema } from '@/lib/validation/admins.schema';
import { requireAdmin } from '@/lib/api/auth';
import { buildResponse, handleApiError } from '@/lib/api/response';
import type { Admin } from '@/lib/types';
import type { z } from 'zod';

type AdminUpdate = z.infer<typeof adminUpdateSchema>;

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admins/[id] - Get single admin
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin role
    const { admin } = await requireAdmin({ role: 'admin' });
    const adminId = params?.id;

    if (!adminId) {
      return NextResponse.json(
        {
          error: 'Admin ID is required',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('id', adminId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Admin not found',
            code: 'NOT_FOUND'
          },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch admin: ${error.message}`);
    }

    // Validate response data
    const validation = adminSchema.safeParse(data);
    if (!validation.success) {
      throw new Error('Invalid admin data from database');
    }

    return NextResponse.json(
      buildResponse({ data: validation.data })
    );

  } catch (error) {
    return handleApiError(error, 'admins.[id].GET');
  }
}

// PUT /api/admins/[id] - Update admin
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require superadmin role
    const { admin: currentAdmin } = await requireAdmin({ role: 'superadmin' });
    const adminId = params?.id;

    if (!adminId) {
      return NextResponse.json(
        {
          error: 'Admin ID is required',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = adminUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    const updateData: AdminUpdate = validation.data;

    // Check if admin exists
    const { data: existingAdmin, error: checkError } = await supabaseAdmin
      .from('admins')
      .select('id, email')
      .eq('id', adminId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Admin not found',
            code: 'NOT_FOUND'
          },
          { status: 404 }
        );
      }
      throw new Error(`Failed to check existing admin: ${checkError.message}`);
    }

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== existingAdmin.email) {
      const { data: emailCheck, error: emailError } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('email', updateData.email)
        .neq('id', adminId)
        .single();

      if (emailError && emailError.code !== 'PGRST116') {
        throw new Error(`Failed to check email uniqueness: ${emailError.message}`);
      }

      if (emailCheck) {
        return NextResponse.json(
          {
            error: 'An admin with this email already exists',
            code: 'DUPLICATE_EMAIL'
          },
          { status: 409 }
        );
      }
    }

    // Update admin
    const { data, error: updateError } = await supabaseAdmin
      .from('admins')
      .update(updateData)
      .eq('id', adminId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update admin: ${updateError.message}`);
    }

    // Validate response data
    const validatedAdmin = adminSchema.safeParse(data);
    if (!validatedAdmin.success) {
      throw new Error('Invalid admin data returned from database');
    }

    return NextResponse.json(
      buildResponse({ data: validatedAdmin.data })
    );

  } catch (error) {
    return handleApiError(error, 'admins.[id].PUT');
  }
}

// DELETE /api/admins/[id] - Delete admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require superadmin role
    const { admin: currentAdmin } = await requireAdmin({ role: 'superadmin' });
    const adminId = params?.id;

    if (!adminId) {
      return NextResponse.json(
        {
          error: 'Admin ID is required',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (currentAdmin.id === adminId) {
      return NextResponse.json(
        {
          error: 'Cannot delete your own account',
          code: 'SELF_DELETE_NOT_ALLOWED'
        },
        { status: 403 }
      );
    }

    // Check if admin exists
    const { data: existingAdmin, error: checkError } = await supabaseAdmin
      .from('admins')
      .select('id, first_name, last_name')
      .eq('id', adminId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Admin not found',
            code: 'NOT_FOUND'
          },
          { status: 404 }
        );
      }
      throw new Error(`Failed to check existing admin: ${checkError.message}`);
    }

    // Delete admin
    const { error: deleteError } = await supabaseAdmin
      .from('admins')
      .delete()
      .eq('id', adminId);

    if (deleteError) {
      throw new Error(`Failed to delete admin: ${deleteError.message}`);
    }

    return NextResponse.json(
      buildResponse({ 
        data: { 
          message: `Admin ${existingAdmin.first_name} ${existingAdmin.last_name} has been deleted successfully` 
        }
      })
    );

  } catch (error) {
    return handleApiError(error, 'admins.[id].DELETE');
  }
}