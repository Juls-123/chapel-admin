import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const updateOverrideReasonSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').optional(),
  description: z.string().optional(),
  requires_note: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get admin profile to check permissions
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    // Only superadmins can update override reasons
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the request data
    const validationResult = updateOverrideReasonSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const { data: updatedReason, error: updateError } = await supabaseAdmin
      .from('override_reason_definitions')
      .update(validationResult.data)
      .eq('id', params.id)
      .select(`
        id,
        code,
        display_name,
        description,
        requires_note,
        created_by,
        created_at,
        is_active,
        admins!override_reason_definitions_created_by_fkey(first_name, last_name)
      `)
      .single();

    if (updateError) {
      console.error('Error updating override reason:', updateError);
      if (updateError.code === 'PGRST116') { // No rows returned
        return NextResponse.json({ error: 'Override reason not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update override reason' }, { status: 500 });
    }

    // Transform response
    const transformedData = {
      ...updatedReason,
      created_by_name: updatedReason.admins && Array.isArray(updatedReason.admins) && updatedReason.admins.length > 0
        ? `${updatedReason.admins[0].first_name} ${updatedReason.admins[0].last_name}`
        : 'System',
      admins: undefined,
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Override reason update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get admin profile to check permissions
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    // Only superadmins can delete override reasons
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Hard delete the override reason
    const { data: deletedReason, error: deleteError } = await supabaseAdmin
      .from('override_reason_definitions')
      .delete()
      .eq('id', params.id)
      .select('id, display_name')
      .single();

    if (deleteError) {
      console.error('Error deleting override reason:', deleteError);
      if (deleteError.code === 'PGRST116') { // No rows returned
        return NextResponse.json({ 
          error: 'Override reason not found',
          details: 'The specified override reason does not exist or has already been deleted.'
        }, { status: 404 });
      }
      if (deleteError.code === '23503') { // Foreign key constraint violation
        return NextResponse.json({ 
          error: 'Cannot delete override reason',
          details: 'This override reason is currently being used and cannot be deleted. Please remove all references first.'
        }, { status: 409 });
      }
      return NextResponse.json({ 
        error: 'Failed to delete override reason',
        details: 'An unexpected error occurred while deleting the override reason. Please try again.'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Override reason "${deletedReason.display_name}" has been permanently deleted` 
    });
  } catch (error) {
    console.error('Override reason deletion API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
