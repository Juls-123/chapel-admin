import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const serviceQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val, 10)),
  limit: z.string().optional().default('10').transform(val => parseInt(val, 10)),
  type: z.enum(['morning', 'evening', 'special']).optional(),
  status: z.enum(['scheduled', 'active', 'completed', 'canceled']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
});

const createServiceSchema = z.object({
  type: z.enum(['morning', 'evening', 'special']),
  name: z.string().optional(),
  service_date: z.string(),
  applicable_levels: z.array(z.string()).optional(),
  constraints: z.any().optional(),
});

// Helper function to get authenticated admin from request
async function getAdminFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header', status: 401 };
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return { error: 'Invalid token', status: 401 };
    }

    // Get admin record with role information
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role, first_name, last_name, email')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      console.error('Admin lookup error:', adminError);
      return { error: 'Admin access required', status: 403 };
    }

    return { admin };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Authentication failed', status: 500 };
  }
}

// Helper function to log admin actions
async function logAdminAction(
  adminId: string, 
  action: string, 
  objectType: string | null = null,
  objectId: string | null = null,
  objectLabel: string | null = null,
  details: Record<string, any> = {}
) {
  try {
    await supabaseAdmin
      .from('admin_actions')
      .insert({
        admin_id: adminId,
        action,
        object_type: objectType,
        object_id: objectId,
        object_label: objectLabel,
        details,
        created_at: new Date().toISOString(),
      });

  } catch (error) {
    console.error('Admin action logging error:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validation = serviceQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters',
        details: validation.error.errors
      }, { status: 400 });
    }

    const params = validation.data;

    // Get total count first
    let countQuery = supabaseAdmin
      .from('services')
      .select('*', { count: 'exact', head: true });

    // Apply same filters for count
    if (params.type) {
      countQuery = countQuery.eq('type', params.type);
    }
    if (params.status) {
      countQuery = countQuery.eq('status', params.status);
    }
    if (params.date_from) {
      countQuery = countQuery.gte('service_date', params.date_from);
    }
    if (params.date_to) {
      countQuery = countQuery.lte('service_date', params.date_to);
    }
    if (params.search) {
      countQuery = countQuery.or(`name.ilike.%${params.search}%,type.ilike.%${params.search}%`);
    }

    const { count, error: countError } = await countQuery;
    
    if (countError) {
      return NextResponse.json({ 
        error: 'Database error',
        details: countError.message 
      }, { status: 500 });
    }

    // Build main query
    let query = supabaseAdmin
      .from('services')
      .select(`
        id,
        type,
        name,
        service_date,
        status,
        created_by,
        created_at,
        locked_after_ingestion
      `);

    // Apply filters
    if (params.type) {
      query = query.eq('type', params.type);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.date_from) {
      query = query.gte('service_date', params.date_from);
    }
    if (params.date_to) {
      query = query.lte('service_date', params.date_to);
    }
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,type.ilike.%${params.search}%`);
    }

    // Apply pagination and ordering
    const offset = (params.page - 1) * params.limit;
    query = query
      .order('service_date', { ascending: false })
      .range(offset, offset + params.limit - 1);

    const { data: services, error: servicesError } = await query;

    if (servicesError) {
      return NextResponse.json({ 
        error: 'Database error',
        details: servicesError.message 
      }, { status: 500 });
    }

    // Transform services for response
    const transformedServices = (services || []).map(service => ({
      id: service.id,
      type: service.type,
      name: service.name,
      service_date: service.service_date,
      date: service.service_date, // Frontend compatibility
      status: service.status,
      created_by: service.created_by,
      created_at: service.created_at,
      locked_after_ingestion: service.locked_after_ingestion,
      applicable_levels: [], // Will be populated if needed
      service_levels: [] // Will be populated if needed
    }));

    // Calculate pagination
    const totalPages = count ? Math.ceil(count / params.limit) : 0;
    const pagination = {
      page: params.page,
      limit: params.limit,
      total: count || 0,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1
    };

    const response = {
      data: transformedServices,
      pagination
    };

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while fetching services'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    // Parse and validate request body
    const body = await request.json();
    
    const validation = createServiceSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      }, { status: 400 });
    }

    const serviceData = validation.data;

    // Create the service
    const { data: newService, error: serviceError } = await supabaseAdmin
      .from('services')
      .insert({
        type: serviceData.type,
        name: serviceData.name,
        service_date: serviceData.service_date,
        status: 'scheduled',
        created_by: admin.id,
        locked_after_ingestion: false
      })
      .select()
      .single();

    if (serviceError) {
      return NextResponse.json({ 
        error: 'Failed to create service',
        details: serviceError.message 
      }, { status: 500 });
    }

    // Create service levels if applicable_levels provided
    if (serviceData.applicable_levels && serviceData.applicable_levels.length > 0) {
      const serviceLevels = serviceData.applicable_levels.map(levelId => ({
        service_id: newService.id,
        level_id: parseInt(levelId, 10),
        constraints: serviceData.constraints || null
      }));

      await supabaseAdmin
        .from('service_levels')
        .insert(serviceLevels);
    }

    // Log admin action
    await logAdminAction(
      admin.id,
      'created_service',
      'service',
      newService.id,
      serviceData.name || serviceData.type,
      { type: serviceData.type, service_date: serviceData.service_date }
    );

    // Transform service for response
    const transformedService = {
      id: newService.id,
      type: newService.type,
      name: newService.name,
      service_date: newService.service_date,
      date: newService.service_date,
      status: newService.status,
      created_by: newService.created_by,
      created_at: newService.created_at,
      locked_after_ingestion: newService.locked_after_ingestion,
      applicable_levels: serviceData.applicable_levels || [],
      service_levels: []
    };

    return NextResponse.json({
      data: transformedService,
      message: 'Service created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while creating service'
    }, { status: 500 });
  }
}
