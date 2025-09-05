// Read-only hook for fetching student attendance data
// NOTE: This file is swap-ready for production Supabase Auth — replace with Supabase wrapper only. Do not change callsites.
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { useQuery } from '@tanstack/react-query';
import { vwStudentProfileAttendanceSchema } from '@/lib/validation/vw_student_profile_attendance.schema';
import { VwStudentProfileAttendance } from '@/lib/types/index';
import { handleError, logError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/requestFactory';

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
        
        const data = await api.get<VwStudentProfileAttendance[]>(`/api/students/${studentId}/attendance`);
        
        // Validate response using Zod schema
        const validationResult = vwStudentProfileAttendanceSchema.array().safeParse(data);
        
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
        // Handle 404 or missing API endpoint gracefully
        if (error instanceof Error && error.message.includes('404')) {
          console.warn('Attendance API endpoint not yet implemented, returning empty array');
          return [];
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
    retry: 1, // Reduce retries since API might not exist yet
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
