import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const updateServiceConstraintSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  constraint_rule: z.record(z.any()).optional(),
  description: z.string().optional(),
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

    // Only superadmins can update service constraints
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the request data
    const validationResult = updateServiceConstraintSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const { data: updatedConstraint, error: updateError } = await supabaseAdmin
      .from('service_constraint_definitions')
      .update(validationResult.data)
      .eq('id', params.id)
      .select(`
        id,
        name,
        constraint_rule,
        description,
        created_by,
        created_at,
        is_active,
        admins!service_constraint_definitions_created_by_fkey(first_name, last_name)
      `)
      .single();

    if (updateError) {
      console.error('Error updating service constraint:', updateError);
      if (updateError.code === 'PGRST116') { // No rows returned
        return NextResponse.json({ error: 'Service constraint not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update service constraint' }, { status: 500 });
    }

    // Transform response
    const transformedData = {
      ...updatedConstraint,
      created_by_name: updatedConstraint.admins && Array.isArray(updatedConstraint.admins) && updatedConstraint.admins.length > 0
        ? `${updatedConstraint.admins[0].first_name} ${updatedConstraint.admins[0].last_name}`
        : 'System',
      admins: undefined,
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Service constraint update API error:', error);
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

    // Only superadmins can delete service constraints
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Hard delete the service constraint
    const { data: deletedConstraint, error: deleteError } = await supabaseAdmin
      .from('service_constraint_definitions')
      .delete()
      .eq('id', params.id)
      .select('id, name')
      .single();

    if (deleteError) {
      console.error('Error deleting service constraint:', deleteError);
      if (deleteError.code === 'PGRST116') { // No rows returned
        return NextResponse.json({ 
          error: 'Service constraint not found',
          details: 'The specified service constraint does not exist or has already been deleted.'
        }, { status: 404 });
      }
      if (deleteError.code === '23503') { // Foreign key constraint violation
        return NextResponse.json({ 
          error: 'Cannot delete service constraint',
          details: 'This service constraint is currently being used and cannot be deleted. Please remove all references first.'
        }, { status: 409 });
      }
      return NextResponse.json({ 
        error: 'Failed to delete service constraint',
        details: 'An unexpected error occurred while deleting the service constraint. Please try again.'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Service constraint "${deletedConstraint.name}" has been permanently deleted` 
    });
  } catch (error) {
    console.error('Service constraint deletion API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
