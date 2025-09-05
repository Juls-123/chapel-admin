import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin role
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch upload errors
    const { data: errors, error } = await supabaseAdmin
      .from('upload_errors')
      .select(`
        id,
        upload_id,
        row_number,
        field_name,
        error_type,
        error_message,
        raw_data,
        created_at
      `)
      .eq('upload_id', params.id)
      .order('row_number', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching upload errors:', error);
      return NextResponse.json({ error: 'Failed to fetch upload errors' }, { status: 500 });
    }

    return NextResponse.json(errors);
  } catch (error) {
    console.error('Upload errors API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin role
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Only superadmins can create error records
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      row_number,
      field_name,
      error_type,
      error_message,
      raw_data
    } = body;

    // Create error record
    const { data: errorRecord, error } = await supabaseAdmin
      .from('upload_errors')
      .insert({
        upload_id: params.id,
        row_number,
        field_name,
        error_type,
        error_message,
        raw_data
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating upload error record:', error);
      return NextResponse.json({ error: 'Failed to create error record' }, { status: 500 });
    }

    return NextResponse.json(errorRecord, { status: 201 });
  } catch (error) {
    console.error('Upload error creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
