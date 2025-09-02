// Read-only hook for fetching students data
// NOTE: This file is swap-ready for production Supabase Auth — replace with Supabase wrapper only. Do not change callsites.
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { useQuery } from '@tanstack/react-query';
import { studentSchema } from '@/lib/validation/students.schema';
import { Student } from '@/lib/types/index';
import { handleError, logError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { getCurrentUser } from '@/services/authService';

export function useStudents() {
  const { error: showError } = useToastExt();

  const query = useQuery({
    queryKey: ['students'],
    queryFn: async (): Promise<Student[]> => {
      try {
        // Include auth context for admin-specific data
        const user = await getCurrentUser();
        
        const response = await fetch('/api/students', {
          headers: {
            'Content-Type': 'application/json',
            // TODO: Add auth headers when real API is implemented
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch students: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validate response using Zod schema
        const validationResult = studentSchema.array().safeParse(data);
        
        if (!validationResult.success) {
          const error = new Error('Student data validation failed');
          logError(error, { 
            component: 'useStudents',
            validationErrors: validationResult.error.errors,
            userId: user?.id 
          });
          showError('Data validation failed', 'Student data format is invalid');
          throw error;
        }

        return validationResult.data;
      } catch (error) {
        const { message } = handleError(error, { 
          component: 'useStudents',
          action: 'fetchStudents' 
        });
        showError('Failed to load students', message);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const getAllStudents = async (): Promise<Student[]> => {
    if (query.data) {
      return query.data;
    }
    
    // Trigger refetch if no data
    const result = await query.refetch();
    return result.data || [];
  };

  const getStudentById = (id: string): Student | undefined => {
    return query.data?.find((student: Student) => student.id === id);
  };

  const getStudentsByLevel = (levelId: string): Student[] => {
    return query.data?.filter((student: Student) => student.level_id === levelId) || [];
  };

  return {
    data: query.data || [],
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    getAllStudents,
    getStudentById,
    getStudentsByLevel,
  };
}
