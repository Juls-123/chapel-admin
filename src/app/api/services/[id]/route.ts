import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const updateServiceSchema = z.object({
  type: z.enum(['morning', 'evening', 'special']).optional(),
  name: z.string().optional(),
  service_date: z.string().optional(),
  status: z.enum(['scheduled', 'active', 'completed', 'canceled']).optional(),
  applicable_levels: z.array(z.string()).optional(),
  constraints: z.any().optional(),
});

// Helper function to get authenticated admin from request
async function getAdminFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Unauthorized', status: 401 };
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return { error: 'Invalid token', status: 401 };
    }

    // Get admin record with role information
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role, first_name, last_name, email')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return { error: 'Admin access required', status: 403 };
    }

    return { admin };
  } catch (error) {
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const serviceId = params.id;

    // Get service with service levels
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select(`
        id,
        type,
        name,
        service_date,
        status,
        created_by,
        created_at,
        locked_after_ingestion,
        service_levels (
          id,
          level_id,
          constraints,
          levels (
            id,
            code,
            name
          )
        )
      `)
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ 
        error: 'Service not found',
        details: serviceError?.message || 'No service found with this ID'
      }, { status: 404 });
    }

    // Transform service for response
    const transformedService = {
      id: service.id,
      type: service.type,
      name: service.name,
      service_date: service.service_date,
      date: service.service_date,
      status: service.status,
      created_by: service.created_by,
      created_at: service.created_at,
      locked_after_ingestion: service.locked_after_ingestion,
      service_levels: service.service_levels || [],
      applicable_levels: (service.service_levels || []).map((sl: any) => sl.level_id)
    };

    return NextResponse.json({
      data: transformedService
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while fetching service'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { admin } = authResult;
    const { id: serviceId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateServiceSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Check if service exists and is not locked
    const { data: existingService, error: fetchError } = await supabaseAdmin
      .from('services')
      .select('id, type, name, service_date, status, locked_after_ingestion')
      .eq('id', serviceId)
      .single();

    if (fetchError || !existingService) {
      return NextResponse.json({ 
        error: 'Service not found',
        details: fetchError?.message || 'No service found with this ID'
      }, { status: 404 });
    }

    if (existingService.locked_after_ingestion) {
      return NextResponse.json({
        error: 'Service is locked',
        details: 'Cannot modify service after attendance has been ingested'
      }, { status: 409 });
    }

    // Update the service
    const { data: updatedService, error: updateError } = await supabaseAdmin
      .from('services')
      .update({
        type: updateData.type,
        name: updateData.name,
        service_date: updateData.service_date,
        status: updateData.status,
      })
      .eq('id', serviceId)
      .select(`
        id,
        type,
        name,
        service_date,
        status,
        created_by,
        created_at,
        locked_after_ingestion
      `)
      .single();

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to update service',
        details: updateError.message
      }, { status: 500 });
    }

    // Update service levels if applicable_levels provided
    if (updateData.applicable_levels) {
      // Delete existing service levels
      await supabaseAdmin
        .from('service_levels')
        .delete()
        .eq('service_id', serviceId);

      // Insert new service levels
      if (updateData.applicable_levels.length > 0) {
        const serviceLevels = updateData.applicable_levels.map(levelId => ({
          service_id: serviceId,
          level_id: levelId,
          constraints: updateData.constraints || {}
        }));

        await supabaseAdmin
          .from('service_levels')
          .insert(serviceLevels);
      }
    }

    // Log admin action
    await logAdminAction(
      admin.id,
      'update_service',
      'service',
      serviceId,
      updatedService.name || updatedService.type,
      { updated_fields: Object.keys(updateData), ...updateData }
    );

    // Transform response
    const transformedService = {
      id: updatedService.id,
      type: updatedService.type,
      name: updatedService.name,
      service_date: updatedService.service_date,
      date: updatedService.service_date,
      status: updatedService.status,
      created_by: updatedService.created_by,
      created_at: updatedService.created_at,
      locked_after_ingestion: updatedService.locked_after_ingestion,
      applicable_levels: updateData.applicable_levels || [],
      service_levels: []
    };

    return NextResponse.json({
      data: transformedService,
      message: 'Service updated successfully'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while updating service'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { admin } = authResult;

    const { id: serviceId } = await params;

    // Check if service exists
    const { data: existingService, error: fetchError } = await supabaseAdmin
      .from('services')
      .select('id, type, name, status, locked_after_ingestion')
      .eq('id', serviceId)
      .single();

    if (fetchError || !existingService) {
      return NextResponse.json({ 
        error: 'Service not found',
        details: fetchError?.message || 'No service found with this ID'
      }, { status: 404 });
    }

    if (existingService.locked_after_ingestion) {
      return NextResponse.json({
        error: 'Service is locked',
        details: 'Cannot cancel service after attendance has been ingested'
      }, { status: 409 });
    }

    // Soft delete by setting status to canceled
    const { error: deleteError } = await supabaseAdmin
      .from('services')
      .update({ status: 'canceled' })
      .eq('id', serviceId);

    if (deleteError) {
      return NextResponse.json({
        error: 'Failed to cancel service',
        details: deleteError.message
      }, { status: 500 });
    }

    // Log admin action
    await logAdminAction(
      admin.id,
      'cancel_service',
      'service',
      serviceId,
      existingService.name || existingService.type,
      { previous_status: existingService.status }
    );

    return NextResponse.json({
      message: 'Service canceled successfully'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while canceling service'
    }, { status: 500 });
  }
}
