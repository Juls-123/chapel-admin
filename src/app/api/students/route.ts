import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const createStudentSchema = z.object({
  matric_number: z.string().min(1, 'Matriculation number is required'),
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  parent_email: z.string().email('Invalid parent email address'),
  parent_phone: z.string().min(1, 'Parent phone is required'),
  level: z.number().int().min(100).max(500),
  gender: z.enum(['male', 'female']),
  department: z.string().min(1, 'Department is required'),
});

const bulkCreateStudentsSchema = z.array(createStudentSchema);

export async function GET(request: NextRequest) {
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
   const url = new URL(request.url);
   const page = parseInt(url.searchParams.get('page') || '1');
   const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100); // Cap at 100
   const search = url.searchParams.get('search')?.trim() || '';
   const matricFilter = url.searchParams.get('matric')?.trim() || '';
   const level = url.searchParams.get('level');
   const status = url.searchParams.get('status') || 'all';
   const department = url.searchParams.get('department');

   const offset = (page - 1) * limit;

   // Build base query
   let query = supabaseAdmin
     .from('students')
     .select(`
       id,
       matric_number,
       first_name,
       middle_name,
       last_name,
       full_name,
       email,
       parent_email,
       parent_phone,
       gender,
       department,
       status,
       created_at,
       updated_at,
       levels!students_level_id_fkey(code, name)
     `, { count: 'exact' })
     .order('created_at', { ascending: false });

   // Apply search filters
   if (search) {
     // Search across multiple fields
     query = query.or(`
       full_name.ilike.%${search}%,
       matric_number.ilike.%${search}%,
       email.ilike.%${search}%,
       department.ilike.%${search}%
     `);
   }

   // Add specific matric number filter
   if (matricFilter) {
     query = query.ilike('matric_number', `%${matricFilter}%`);
   }

   // Apply other filters
   if (level) {
     const { data: levelData } = await supabaseAdmin
       .from('levels')
       .select('id')
       .eq('code', level)
       .single();
     
     if (levelData) {
       query = query.eq('level_id', levelData.id);
     }
   }

   if (department) {
     query = query.ilike('department', `%${department}%`);
   }

   if (status !== 'all') {
     query = query.eq('status', status);
   }

   // Execute query with pagination
   const { data, error, count } = await query.range(offset, offset + limit - 1);

   if (error) {
     console.error('Error fetching students:', error);
     return NextResponse.json({ 
       error: 'Failed to fetch students',
       details: error.message 
     }, { status: 500 });
   }

   // Transform data to include level information
   const transformedData = data?.map((student: any) => ({
     ...student,
     level: student.levels?.code ? parseInt(student.levels.code) : null,
     level_name: student.levels?.name,
     levels: undefined, // Remove the nested object
   }));

   return NextResponse.json({
     data: transformedData || [],
     pagination: {
       page,
       limit,
       total: count || 0,
       totalPages: Math.ceil((count || 0) / limit),
     },
   });
 } catch (error) {
   console.error('Students API error:', error);
   return NextResponse.json({ 
     error: 'Internal server error',
     details: 'An unexpected error occurred while fetching students'
   }, { status: 500 });
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

    // Get admin profile and verify superadmin role
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    
    console.log('🔍 Backend: Received request body');
    console.log('Body keys:', Object.keys(body));
    console.log('Body type:', typeof body);
    console.log('Is array:', Array.isArray(body));
    
    // Extract upload metadata if present (for bulk uploads)
    const { students: bulkStudentsData, uploadMetadata, ...singleStudentData } = body;
    
    console.log('🔍 Backend: Extracted data');
    console.log('bulkStudentsData exists:', !!bulkStudentsData);
    console.log('bulkStudentsData type:', typeof bulkStudentsData);
    console.log('bulkStudentsData length:', bulkStudentsData?.length);
    console.log('uploadMetadata:', uploadMetadata);
    console.log('singleStudentData keys:', Object.keys(singleStudentData));
    
    // Determine if this is a bulk upload or single student
    const isBulk = !!bulkStudentsData;
    const actualData = isBulk ? bulkStudentsData : (Array.isArray(body) ? body : singleStudentData);
    
    console.log('🔍 Backend: Processing logic');
    console.log('isBulk:', isBulk);
    console.log('actualData type:', typeof actualData);
    console.log('actualData length:', Array.isArray(actualData) ? actualData.length : 'not array');
    console.log('First record sample:', Array.isArray(actualData) ? actualData[0] : actualData);
    
    const validationResult = isBulk 
      ? bulkCreateStudentsSchema.safeParse(actualData)
      : createStudentSchema.safeParse(actualData);

    console.log('🔍 Backend: Validation result');
    console.log('Validation success:', validationResult.success);
    if (!validationResult.success) {
      console.error('❌ Validation errors:', validationResult.error.errors.slice(0, 5));
      console.error('Total validation errors:', validationResult.error.errors.length);
    }

    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const studentsToCreate = (isBulk ? validationResult.data : [validationResult.data]) as any[];
    
    // Create upload history record for bulk uploads
    let uploadBatchId = null;
    if (isBulk && uploadMetadata) {
      const { data: uploadRecord, error: uploadError } = await supabaseAdmin
        .from('upload_history')
        .insert({
          file_name: uploadMetadata.fileName,
          file_size: uploadMetadata.fileSize || 0,
          file_type: 'xlsx',
          mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          records_total: studentsToCreate.length,
          records_processed: 0,
          status: 'pending',           
          upload_status: 'processing', 
          uploaded_by: admin.id,
          entity_type: 'students'
        })
        .select('id')
        .single();

      if (uploadError) {
        console.error('Error creating upload record:', uploadError);
        return NextResponse.json({ 
          error: 'Failed to create upload record',
          details: uploadError.message
        }, { status: 500 });
      }

      uploadBatchId = uploadRecord.id;
    }

    // CORRECTED: Validate levels exist (don't create them)
    const uniqueLevels = [...new Set(studentsToCreate.map((s: any) => s.level.toString()))];
    const { data: existingLevels, error: levelFetchError } = await supabaseAdmin
      .from('levels')
      .select('id, code')
      .in('code', uniqueLevels);

    if (levelFetchError) {
      console.error('Error fetching levels:', levelFetchError);
      if (uploadBatchId) {
        await supabaseAdmin
          .from('upload_history')
          .update({ 
            status: 'failed',
            upload_status: 'failed',
            completed_at: new Date().toISOString() 
          })
          .eq('id', uploadBatchId);

        await supabaseAdmin.from('upload_errors').insert({
          upload_id: uploadBatchId,
          row_number: 0,
          field_name: 'level',
          error_type: 'system_error',
          error_message: `Failed to fetch academic levels: ${levelFetchError.message}`,
          raw_value: uniqueLevels.join(', ')
        });
      }
      return NextResponse.json({ 
        error: 'Failed to validate academic levels',
        details: levelFetchError.message
      }, { status: 500 });
    }

    const levelMap = new Map(existingLevels?.map((l: any) => [l.code, l.id]) || []);

    // CORRECTED: Check for invalid levels (reject instead of creating)
    const invalidLevels = uniqueLevels.filter(level => !levelMap.has(level));
    if (invalidLevels.length > 0) {
      if (uploadBatchId) {
        await supabaseAdmin
          .from('upload_history')
          .update({ 
            status: 'failed',
            upload_status: 'failed',
            completed_at: new Date().toISOString() 
          })
          .eq('id', uploadBatchId);

        // Log validation errors
        await supabaseAdmin.from('upload_errors').insert(
          invalidLevels.map((level) => ({
            upload_id: uploadBatchId,
            row_number: 0,
            field_name: 'level',
            error_type: 'validation_error',
            error_message: `Invalid academic level: ${level}. Level does not exist in system.`,
            raw_value: level
          }))
        );
      }
      
      return NextResponse.json({ 
        error: 'Invalid academic levels found',
        details: `The following levels do not exist in the system: ${invalidLevels.join(', ')}. Please contact an administrator to add these levels first.`,
        invalid_levels: invalidLevels
      }, { status: 400 });
    }

    // Process each student with duplicate handling
    const results = [];
    const errors = [];
    const duplicates = [];
    
    for (const studentData of studentsToCreate) {
      try {
        // Check for existing student by matric number
        const { data: existingStudent, error: checkError } = await supabaseAdmin
          .from('students')
          .select('id, matric_number, first_name, last_name, status')
          .eq('matric_number', studentData.matric_number)
          .single();

        if (existingStudent && !checkError) {
          // Student already exists
          duplicates.push({
            student: `${studentData.first_name} ${studentData.last_name}`,
            matric_number: studentData.matric_number,
            existing_status: existingStudent.status,
            action: existingStudent.status === 'inactive' ? 'reactivated' : 'skipped'
          });

          // If student is inactive, reactivate them
          if (existingStudent.status === 'inactive') {
            const { error: updateError } = await supabaseAdmin
              .from('students')
              .update({
                first_name: studentData.first_name,
                middle_name: studentData.middle_name || null,
                last_name: studentData.last_name,
                email: studentData.email,
                parent_email: studentData.parent_email,
                parent_phone: studentData.parent_phone,
                gender: studentData.gender,
                department: studentData.department,
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingStudent.id);

            if (updateError) {
              errors.push({
                student: `${studentData.first_name} ${studentData.last_name}`,
                matric_number: studentData.matric_number,
                error: `Failed to reactivate: ${updateError.message}`
              });
            } else {
              results.push({ ...existingStudent, status: 'active' });
            }
          }
          continue; // Skip to next student
        }

        // CORRECTED: Simple level lookup (no creation)
        const levelId = levelMap.get(studentData.level.toString());
        if (!levelId) {
          errors.push({
            student: `${studentData.first_name} ${studentData.last_name}`,
            matric_number: studentData.matric_number,
            error: `Invalid level: ${studentData.level}. Level does not exist in system.`
          });
          continue;
        }

        // Create student record
        const { data: student, error: studentError } = await supabaseAdmin
          .from('students')
          .insert({
            matric_number: studentData.matric_number,
            first_name: studentData.first_name,
            middle_name: studentData.middle_name || null,
            last_name: studentData.last_name,
            email: studentData.email,
            parent_email: studentData.parent_email,
            parent_phone: studentData.parent_phone,
            level_id: levelId,
            gender: studentData.gender,
            department: studentData.department,
            status: 'active',
            upload_batch_id: uploadBatchId // Link to upload batch
          })
          .select(`
            id,
            matric_number,
            first_name,
            middle_name,
            last_name,
            full_name,
            email,
            parent_email,
            parent_phone,
            gender,
            department,
            status,
            created_at,
            levels!students_level_id_fkey(code, name)
          `);

        if (studentError) {
          errors.push({
            student: `${studentData.first_name} ${studentData.last_name}`,
            matric_number: studentData.matric_number,
            error: studentError.message
          });
        } else {
          results.push(student);
        }
      } catch (error) {
        errors.push({
          student: `${studentData.first_name} ${studentData.last_name}`,
          matric_number: studentData.matric_number,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update upload history with results
    if (uploadBatchId) {
      const finalStatus = errors.length === 0 ? 'completed' : 
                         results.length === 0 ? 'failed' : 'partial';
      
      await supabaseAdmin
        .from('upload_history')
        .update({ 
          status: finalStatus,
          upload_status: finalStatus,
          records_processed: results.length,
          completed_at: new Date().toISOString() 
        })
        .eq('id', uploadBatchId);

      // Log errors to upload_errors table
      if (errors.length > 0) {
        const errorRecords = errors.map((error, index) => ({
          upload_id: uploadBatchId,
          row_number: index + 2, // +2 for header and 1-indexed
          field_name: 'general',
          error_type: 'processing_error',
          error_message: error.error,
          raw_value: JSON.stringify(error)
        }));
        
        await supabaseAdmin.from('upload_errors').insert(errorRecords);
      }
    }

    const responseData = isBulk ? results : results[0];
    const successCount = results.length;
    const errorCount = errors.length;
    const duplicateCount = duplicates.length;

    return NextResponse.json({
      success: true,
      data: responseData,
      summary: isBulk ? {
        total_processed: successCount + errorCount + duplicateCount,
        successful: successCount,
        errors: errorCount,
        duplicates: duplicateCount,
        duplicate_details: duplicates,
        error_details: errors
      } : undefined
    });

  } catch (error) {
    console.error('Error in student creation:', error);
    
    return NextResponse.json({ 
      error: 'Failed to process students',
      details: 'An unexpected error occurred while creating students. Please try again.'
    }, { status: 500 });
  }
}