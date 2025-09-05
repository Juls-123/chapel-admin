import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const serviceConstraintSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  constraint_rule: z.record(z.any()),
  description: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  is_active: z.boolean(),
});

const createServiceConstraintSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  constraint_rule: z.record(z.any()).refine((val) => typeof val === 'object' && val !== null, {
    message: 'Constraint rule must be a valid JSON object'
  }),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = supabaseAdmin
      .from('service_constraint_definitions')
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
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching service constraints:', error);
      return NextResponse.json({ error: 'Failed to fetch service constraints' }, { status: 500 });
    }

    // Transform data to include creator name
    const transformedData = data?.map(item => ({
      ...item,
      created_by_name: item.admins && Array.isArray(item.admins) && item.admins.length > 0
        ? `${item.admins[0].first_name} ${item.admins[0].last_name}`
        : 'System',
      admins: undefined, // Remove the nested object
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Service constraints API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Only superadmins can create service constraints
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the request data
    const validationResult = createServiceConstraintSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const { data: newConstraint, error: insertError } = await supabaseAdmin
      .from('service_constraint_definitions')
      .insert({
        ...validationResult.data,
        created_by: admin.id,
      })
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

    if (insertError) {
      console.error('Error creating service constraint:', insertError);
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Conflict: Name already exists',
          details: `A service constraint with the name "${validationResult.data.name}" has been created before. Please use a different name.`
        }, { status: 409 });
      }
      return NextResponse.json({ 
        error: 'Failed to create service constraint',
        details: 'An unexpected error occurred while creating the service constraint. Please try again.'
      }, { status: 500 });
    }

    // Transform response
    const transformedData = {
      ...newConstraint,
      created_by_name: newConstraint.admins && Array.isArray(newConstraint.admins) && newConstraint.admins.length > 0
        ? `${newConstraint.admins[0].first_name} ${newConstraint.admins[0].last_name}`
        : 'System',
      admins: undefined,
    };

    return NextResponse.json(transformedData, { status: 201 });
  } catch (error) {
    console.error('Service constraint creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
