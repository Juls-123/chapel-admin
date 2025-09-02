// Read-only hook for fetching semesters data
// NOTE: This file is swap-ready for production Supabase Auth — replace with Supabase wrapper only. Do not change callsites.
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { useQuery } from '@tanstack/react-query';
import { semesterSchema } from '@/lib/validation/semesters.schema';
import { Semester } from '@/lib/types/index';
import { handleError, logError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { getCurrentUser } from '@/services/authService';

export function useSemesters() {
  const { error: showError } = useToastExt();

  const query = useQuery({
    queryKey: ['semesters'],
    queryFn: async (): Promise<Semester[]> => {
      try {
        // Include auth context for admin-specific data
        const user = await getCurrentUser();
        
        const response = await fetch('/api/semesters', {
          headers: {
            'Content-Type': 'application/json',
            // TODO: Add auth headers when real API is implemented
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch semesters: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validate response using Zod schema
        const validationResult = semesterSchema.array().safeParse(data);
        
        if (!validationResult.success) {
          const error = new Error('Semester data validation failed');
          logError(error, { 
            component: 'useSemesters',
            validationErrors: validationResult.error.errors,
            userId: user?.id 
          });
          showError('Data validation failed', 'Semester data format is invalid');
          throw error;
        }

        return validationResult.data;
      } catch (error) {
        // Handle 404 or missing API endpoint gracefully
        if (error instanceof Error && error.message.includes('404')) {
          console.warn('Semesters API endpoint not yet implemented, returning empty array');
          return [];
        }
        
        const { message } = handleError(error, { 
          component: 'useSemesters',
          action: 'fetchSemesters' 
        });
        showError('Failed to load semesters', message);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (semesters change infrequently)
    retry: 1, // Reduce retries since API might not exist yet
  });

  const getAllSemesters = async (): Promise<Semester[]> => {
    if (query.data) {
      return query.data;
    }
    
    // Trigger refetch if no data
    const result = await query.refetch();
    return result.data || [];
  };

  const getSemesterById = (id: string): Semester | undefined => {
    return query.data?.find(semester => semester.id === id);
  };

  const getCurrentSemester = (): Semester | undefined => {
    const now = new Date();
    return query.data?.find(semester => {
      const startDate = new Date(semester.start_date);
      const endDate = new Date(semester.end_date);
      return now >= startDate && now <= endDate;
    });
  };

  const getActiveSemesters = (): Semester[] => {
    const now = new Date();
    return query.data?.filter(semester => {
      const endDate = new Date(semester.end_date);
      return endDate >= now;
    }) || [];
  };

  return {
    data: query.data || [],
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    getAllSemesters,
    getSemesterById,
    getCurrentSemester,
    getActiveSemesters,
  };
}
