import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { WarningActions } from '@/lib/admin-actions';
import { startOfWeek, endOfWeek, format } from 'date-fns';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const generateWarningsSchema = z.object({
  week_start: z.string(),
  threshold: z.number().min(1).max(10).optional().default(2), // Default threshold of 2 absences
});

export async function POST(request: NextRequest) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validation = generateWarningsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { week_start, threshold } = validation.data;
    const weekStartDate = new Date(week_start);
    const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });

    // Get all services for the week
    const { data: services, error: servicesError } = await supabaseAdmin
      .from('services')
      .select(`
        id,
        service_date,
        type,
        name,
        status,
        service_levels!inner(
          level_id,
          levels!inner(code, name)
        )
      `)
      .gte('service_date', format(weekStartDate, 'yyyy-MM-dd'))
      .lte('service_date', format(weekEndDate, 'yyyy-MM-dd'))
      .eq('status', 'completed');

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
      return NextResponse.json({ 
        error: 'Failed to fetch services for the week',
        details: servicesError.message 
      }, { status: 500 });
    }

    if (!services || services.length === 0) {
      return NextResponse.json({ 
        message: 'No completed services found for this week',
        data: { generated: 0, updated: 0 }
      });
    }

    // Get all active students
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        matric_number,
        first_name,
        middle_name,
        last_name,
        email,
        parent_email,
        parent_phone,
        level_id,
        levels!students_level_id_fkey(code, name)
      `)
      .eq('status', 'active');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json({ 
        error: 'Failed to fetch students',
        details: studentsError.message 
      }, { status: 500 });
    }

    // Calculate absences for each student for this week
    const studentAbsences = new Map<string, number>();
    const missedServiceDates = new Map<string, Date[]>();

    for (const service of services) {
      const serviceDate = new Date(service.service_date);
      
      // Get applicable levels for this service
      const applicableLevels = service.service_levels.map((sl: any) => sl.level_id);
      
      // Get attendance batch for this service
      const { data: batches, error: batchError } = await supabaseAdmin
        .from('current_attendance_batch')
        .select(`
          batch_id,
          attendance_batch_versions!inner(
            attendees,
            absentees,
            level_id
          )
        `)
        .eq('service_id', service.id);

      if (batchError || !batches) {
        console.warn(`No attendance data found for service ${service.id}`);
        continue;
      }

      for (const batch of batches) {
        const batchData = batch.attendance_batch_versions;
        const absentees = (batchData as any).absentees || [];
        
        // Count absences for students in applicable levels
        for (const absentee of absentees) {
          if (absentee.exempted) continue; // Skip exempted students
          
          const studentId = absentee.student_id;
          if (!studentId) continue;

          // Check if student is in applicable level for this service
          const student = students?.find(s => s.id === studentId);
          if (!student || !applicableLevels.includes(student.level_id)) continue;

          // Count the absence
          const currentCount = studentAbsences.get(studentId) || 0;
          studentAbsences.set(studentId, currentCount + 1);

          // Track missed service dates
          const currentDates = missedServiceDates.get(studentId) || [];
          currentDates.push(serviceDate);
          missedServiceDates.set(studentId, currentDates);
        }
      }
    }

    // Generate or update warning snapshots
    let generatedCount = 0;
    let updatedCount = 0;

    for (const [studentId, absenceCount] of studentAbsences.entries()) {
      if (absenceCount < threshold) continue; // Skip if below threshold

      const student = students?.find(s => s.id === studentId);
      if (!student) continue;

      // Check if warning already exists for this week
      const { data: existingWarning, error: existingError } = await supabaseAdmin
        .from('warning_weekly_snapshot')
        .select('id, warning_status, absences')
        .eq('student_id', studentId)
        .eq('week_start', format(weekStartDate, 'yyyy-MM-dd'))
        .single();

      const warningData = {
        student_id: studentId,
        week_start: format(weekStartDate, 'yyyy-MM-dd'),
        absences: absenceCount,
        warning_status: 'pending' as const,
        last_updated_at: new Date().toISOString(),
      };

      if (existingWarning) {
        // Update existing warning if absences changed or status is not sent
        if (existingWarning.absences !== absenceCount || existingWarning.warning_status !== 'sent') {
          const updateData: any = {
            absences: absenceCount,
            last_updated_at: new Date().toISOString(),
          };

          // Only reset to pending if not already sent
          if (existingWarning.warning_status !== 'sent') {
            updateData.warning_status = 'pending';
          }

          const { error: updateError } = await supabaseAdmin
            .from('warning_weekly_snapshot')
            .update(updateData)
            .eq('id', existingWarning.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      } else {
        // Create new warning
        const { error: insertError } = await supabaseAdmin
          .from('warning_weekly_snapshot')
          .insert({
            ...warningData,
            first_created_at: new Date().toISOString(),
          });

        if (!insertError) {
          generatedCount++;
        }
      }
    }

    // Log admin action using centralized system
    await WarningActions.generateWarnings(
      week_start, 
      generatedCount, 
      token
    );

    return NextResponse.json({
      message: 'Warning letters generated successfully',
      data: {
        week_start: format(weekStartDate, 'yyyy-MM-dd'),
        threshold,
        generated: generatedCount,
        updated: updatedCount,
        total_services: services.length,
      },
    });

  } catch (error) {
    console.error('Warning generation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while generating warning letters'
    }, { status: 500 });
  }
}
