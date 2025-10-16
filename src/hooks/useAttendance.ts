// Hook for fetching student attendance data from the profile endpoint
// This is a wrapper around the student profile endpoint to maintain backward compatibility

import { useQuery } from '@tanstack/react-query';
import { vwStudentProfileAttendanceSchema } from '@/lib/validation/vw_student_profile_attendance.schema';
import { VwStudentProfileAttendance } from '@/lib/types/index';
import { handleError, logError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/requestFactory';

// Map profile attendance to the expected VwStudentProfileAttendance format
function mapToVwStudentProfileAttendance(attendance: any): VwStudentProfileAttendance {
  if (!attendance) return {} as VwStudentProfileAttendance;
  
  // Get student info from the attendance record or service
  const studentInfo = attendance.student || attendance.service?.student || {};
  
  return {
    student_id: attendance.student_id || '',
    matric_number: studentInfo.matric_number || '',
    first_name: studentInfo.first_name || '',
    last_name: studentInfo.last_name || '',
    middle_name: studentInfo.middle_name,
    department: studentInfo.department,
    level: studentInfo.level,
    total_present: attendance.status === 'present' ? 1 : 0,
    total_absent: attendance.status === 'absent' ? 1 : 0,
    total_exempted: attendance.status === 'exempted' ? 1 : 0,
    // Include service details if available
    service_id: attendance.service_id,
    service_name: attendance.service?.name,
    service_type: attendance.service?.type,
    service_date: attendance.service?.date,
    status: attendance.status,
    marked_at: attendance.marked_at,
  } as unknown as VwStudentProfileAttendance; // Cast to unknown first to avoid type errors
}

export function useAttendance(studentId?: string) {
  const { error: showError } = useToastExt();

  const query = useQuery({
    queryKey: ['attendance', studentId],
    queryFn: async (): Promise<VwStudentProfileAttendance[]> => {
      if (!studentId) {
        return [];
      }

      try {
        // Include auth context for admin-specific data
        const user = await getCurrentUser();
        
        // Use the new profile endpoint
        const profile = await api.get<any>(`/api/students/${studentId}/profile`);
        
        // Map the response to match the expected format
        const attendanceData = profile?.recent_attendance?.map(mapToVwStudentProfileAttendance) || [];
        
        // Validate response using Zod schema
        const validationResult = vwStudentProfileAttendanceSchema.array().safeParse(attendanceData);
        
        if (!validationResult.success) {
          const error = new Error('Attendance data validation failed');
          logError(error, { 
            component: 'useAttendance',
            validationErrors: validationResult.error.errors,
            userId: user?.id,
            studentId 
          });
          showError('Data validation failed', 'Attendance data format is invalid');
          throw error;
        }

        return validationResult.data;
      } catch (error) {
        // Fallback to old endpoint if profile endpoint fails
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('500'))) {
          console.warn('Profile endpoint failed, falling back to legacy attendance endpoint');
          try {
            const data = await api.get<VwStudentProfileAttendance[]>(`/api/students/${studentId}/attendance`);
            console.warn('DEPRECATION WARNING: Using legacy attendance endpoint. Please update to use the profile endpoint.');
            return data;
          } catch (fallbackError) {
            // If both endpoints fail, return empty array
            return [];
          }
        }
        
        const { message } = handleError(error, { 
          component: 'useAttendance',
          action: 'fetchAttendance',
          studentId 
        });
        showError('Failed to load attendance', message);
        throw error;
      }
    },
    enabled: !!studentId, // Only run query if studentId is provided
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });

  const getAttendanceByService = (serviceId: string): VwStudentProfileAttendance | undefined => {
    return query.data?.find((record: VwStudentProfileAttendance) => record.service_id === serviceId);
  };

  const getTotalAbsences = (): number => {
    return query.data?.reduce((total: number, record: VwStudentProfileAttendance) => total + record.total_absent, 0) || 0;
  };

  const getTotalPresent = (): number => {
    return query.data?.reduce((total: number, record: VwStudentProfileAttendance) => total + record.total_present, 0) || 0;
  };

  const getTotalExempted = (): number => {
    return query.data?.reduce((total: number, record: VwStudentProfileAttendance) => total + record.total_exempted, 0) || 0;
  };

  return {
    data: query.data || [],
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    getAttendanceByService,
    getTotalAbsences,
    getTotalPresent,
    getTotalExempted,
  };
}
