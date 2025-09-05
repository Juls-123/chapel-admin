import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('sb-access-token')?.value;
    
    const token = authHeader?.replace('Bearer ', '') || cookieToken;

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
    const category = searchParams.get('category');
    const entityType = searchParams.get('entity_type');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // For now, return mock data since we don't have the system_issues table yet
    // In a real implementation, you would create the system_issues table and query it
    const mockIssues = [
      {
        id: '1',
        type: 'warning',
        category: 'upload',
        title: 'Duplicate matric numbers detected',
        description: 'Found 3 students with duplicate matriculation numbers during bulk upload',
        affected_records: 3,
        related_entity_type: 'student',
        related_entity_id: null,
        metadata: { file_name: 'students_batch_2024.xlsx' },
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        resolved_by: null
      },
      {
        id: '2',
        type: 'error',
        category: 'validation',
        title: 'Invalid email formats',
        description: 'Multiple student records contain invalid email addresses',
        affected_records: 7,
        related_entity_type: 'student',
        related_entity_id: null,
        metadata: { validation_errors: ['invalid@', 'missing@domain', 'spaces in email'] },
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        resolved_by: null
      },
      {
        id: '3',
        type: 'resolved',
        category: 'data_integrity',
        title: 'Missing parent contact information',
        description: 'Some students were missing parent email or phone numbers',
        affected_records: 12,
        related_entity_type: 'student',
        related_entity_id: null,
        metadata: { resolution: 'Updated records with provided contact information' },
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_by: {
          id: admin.id,
          first_name: 'System',
          last_name: 'Admin'
        }
      }
    ];

    // Apply filters
    let filteredIssues = mockIssues;

    if (category) {
      filteredIssues = filteredIssues.filter(issue => issue.category === category);
    }

    if (entityType) {
      filteredIssues = filteredIssues.filter(issue => issue.related_entity_type === entityType);
    }

    if (status) {
      if (status === 'open') {
        filteredIssues = filteredIssues.filter(issue => !issue.resolved_at);
      } else if (status === 'resolved') {
        filteredIssues = filteredIssues.filter(issue => !!issue.resolved_at);
      }
    }

    if (type && type !== 'all') {
      filteredIssues = filteredIssues.filter(issue => issue.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredIssues = filteredIssues.filter(issue => 
        issue.title.toLowerCase().includes(searchLower) ||
        issue.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const paginatedIssues = filteredIssues.slice(offset, offset + limit);

    return NextResponse.json(paginatedIssues);
  } catch (error) {
    console.error('Issues API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      type,
      category,
      title,
      description,
      affected_records,
      related_entity_type,
      related_entity_id,
      metadata
    } = body;

    // In a real implementation, you would insert into system_issues table
    // For now, return a mock response
    const newIssue = {
      id: Date.now().toString(),
      type,
      category,
      title,
      description,
      affected_records: affected_records || 0,
      related_entity_type,
      related_entity_id,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      resolved_by: null
    };

    return NextResponse.json(newIssue, { status: 201 });
  } catch (error) {
    console.error('Issue creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
