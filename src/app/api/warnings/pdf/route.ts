import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { WarningActions } from '@/lib/admin-actions';
import { format } from 'date-fns';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pdfRequestSchema = z.object({
  matric_number: z.string(),
  week_start: z.string(),
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
      .select('id, role, first_name, last_name')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validation = pdfRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { matric_number, week_start } = validation.data;

    // Get student and warning details
    const { data: student, error: studentError } = await supabaseAdmin
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
        department,
        levels!students_level_id_fkey(code, name)
      `)
      .eq('matric_number', matric_number)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get warning details
    const { data: warning, error: warningError } = await supabaseAdmin
      .from('warning_weekly_snapshot')
      .select('absences, warning_status, first_created_at')
      .eq('student_id', student.id)
      .eq('week_start', week_start)
      .single();

    if (warningError || !warning) {
      return NextResponse.json({ error: 'Warning letter not found' }, { status: 404 });
    }

    // Get missed services for the week
    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const { data: services, error: servicesError } = await supabaseAdmin
      .from('services')
      .select(`
        id,
        service_date,
        type,
        name
      `)
      .gte('service_date', format(weekStartDate, 'yyyy-MM-dd'))
      .lte('service_date', format(weekEndDate, 'yyyy-MM-dd'))
      .eq('status', 'completed')
      .order('service_date');

    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set up response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="warning-letter-${matric_number}-${week_start}.pdf"`);

    // Create readable stream for PDF
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Header with institution details
    doc.fontSize(16)
       .fillColor('#1f2937')
       .font('Helvetica-Bold')
       .text('CHAPEL ATTENDANCE WARNING LETTER', { align: 'center' });

    doc.moveDown(0.5);
    
    doc.fontSize(12)
       .fillColor('#374151')
       .font('Helvetica')
       .text('Chapel Administration Office', { align: 'center' })
       .text('Student Affairs Division', { align: 'center' });

    doc.moveDown(1);

    // Date and reference
    const currentDate = format(new Date(), 'MMMM d, yyyy');
    doc.fontSize(10)
       .fillColor('#6b7280')
       .text(`Date: ${currentDate}`, { align: 'right' })
       .text(`Ref: CA/WL/${matric_number}/${format(new Date(), 'yyyy')}`, { align: 'right' });

    doc.moveDown(1.5);

    // Student details section
    doc.fontSize(12)
       .fillColor('#1f2937')
       .font('Helvetica-Bold')
       .text('STUDENT INFORMATION');

    doc.moveDown(0.5);

    const studentName = `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`;
    
    doc.fontSize(10)
       .fillColor('#374151')
       .font('Helvetica')
       .text(`Name: ${studentName}`)
       .text(`Matric Number: ${student.matric_number}`)
       .text(`Department: ${student.department || 'N/A'}`)
       .text(`Level: ${(student.levels as any)?.name || 'N/A'}`);

    doc.moveDown(1);

    // Warning details section
    doc.fontSize(12)
       .fillColor('#dc2626')
       .font('Helvetica-Bold')
       .text('ATTENDANCE WARNING');

    doc.moveDown(0.5);

    const weekRange = `${format(weekStartDate, 'MMMM d')} - ${format(weekEndDate, 'MMMM d, yyyy')}`;
    
    doc.fontSize(10)
       .fillColor('#374151')
       .font('Helvetica')
       .text(`Week Period: ${weekRange}`)
       .text(`Total Absences: ${warning.absences}`)
       .text(`Warning Generated: ${format(new Date(warning.first_created_at), 'MMMM d, yyyy')}`);

    doc.moveDown(1);

    // Warning message
    doc.fontSize(11)
       .fillColor('#1f2937')
       .font('Helvetica')
       .text('Dear Student,', { indent: 0 });

    doc.moveDown(0.5);

    const warningText = `This letter serves as an official warning regarding your chapel attendance for the week of ${weekRange}. Our records indicate that you have been absent from ${warning.absences} chapel service${warning.absences > 1 ? 's' : ''} during this period.

Chapel attendance is mandatory for all students as outlined in the Student Handbook. Consistent attendance is essential for your spiritual development and is a requirement for your continued enrollment.

You are hereby advised to:
• Ensure regular attendance at all scheduled chapel services
• Contact the Chapel Administration Office if you have valid reasons for absence
• Submit proper documentation for any approved absences (exeats)

Failure to improve your attendance may result in further disciplinary action, including but not limited to:
• Additional warning letters
• Meeting with Student Affairs
• Suspension from academic activities
• Other sanctions as deemed appropriate

We encourage you to take this matter seriously and make the necessary adjustments to ensure full compliance with chapel attendance requirements.`;

    doc.text(warningText, {
      align: 'justify',
      lineGap: 2
    });

    doc.moveDown(1.5);

    // Services missed (if available)
    if (services && services.length > 0) {
      doc.fontSize(11)
         .fillColor('#dc2626')
         .font('Helvetica-Bold')
         .text('MISSED SERVICES:');

      doc.moveDown(0.3);

      services.forEach((service: any) => {
        const serviceName = service.name || `${service.type.charAt(0).toUpperCase() + service.type.slice(1)} Service`;
        doc.fontSize(10)
           .fillColor('#374151')
           .font('Helvetica')
           .text(`• ${format(new Date(service.service_date), 'EEEE, MMMM d, yyyy')} - ${serviceName}`);
      });

      doc.moveDown(1);
    }

    // Footer with signature
    doc.fontSize(10)
       .fillColor('#374151')
       .font('Helvetica')
       .text('Sincerely,');

    doc.moveDown(1);

    doc.font('Helvetica-Bold')
       .text(`${admin.first_name} ${admin.last_name}`)
       .font('Helvetica')
       .text('Chapel Administration Office')
       .text('Student Affairs Division');

    doc.moveDown(1);

    // Contact information
    doc.fontSize(9)
       .fillColor('#6b7280')
       .text('For inquiries, please contact the Chapel Administration Office during regular business hours.')
       .text('This is an automatically generated document.');

    // Add colored border
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
       .strokeColor('#dc2626')
       .lineWidth(2)
       .stroke();

    // Finalize PDF
    doc.end();

    const pdfBuffer = await pdfPromise;

    // Log admin action using centralized system
    await WarningActions.generatePDF(studentName, student.id, token);

    return new NextResponse(pdfBuffer, { headers });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while generating PDF'
    }, { status: 500 });
  }
}
