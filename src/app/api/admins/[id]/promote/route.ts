// Admin promotion API endpoint - POST /api/admins/[id]/promote
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminSchema } from '@/lib/validation/admins.schema';
import { requireAdmin } from '@/lib/api/auth';
import { buildResponse, handleApiError } from '@/lib/api/response';
import type { Admin } from '@/lib/types';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admins/[id]/promote - Promote admin to superadmin
export async function POST(
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

    // Check if admin exists and get current role
    const { data: existingAdmin, error: checkError } = await supabaseAdmin
      .from('admins')
      .select('id, first_name, last_name, role')
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

    // Check if already superadmin
    if (existingAdmin.role === 'superadmin') {
      return NextResponse.json(
        {
          error: `${existingAdmin.first_name} ${existingAdmin.last_name} is already a superadmin`,
          code: 'ALREADY_SUPERADMIN'
        },
        { status: 400 }
      );
    }

    // Promote to superadmin
    const { data, error: promoteError } = await supabaseAdmin
      .from('admins')
      .update({ role: 'superadmin' })
      .eq('id', adminId)
      .select()
      .single();

    if (promoteError) {
      throw new Error(`Failed to promote admin: ${promoteError.message}`);
    }

    // Validate response data
    const validatedAdmin = adminSchema.safeParse(data);
    if (!validatedAdmin.success) {
      throw new Error('Invalid admin data returned from database');
    }

    return NextResponse.json(
      buildResponse({ 
        data: {
          ...validatedAdmin.data,
          message: `${existingAdmin.first_name} ${existingAdmin.last_name} has been promoted to superadmin`
        }
      })
    );

  } catch (error) {
    return handleApiError(error, 'admins.[id].promote.POST');
  }
}