// Read-only hook for fetching levels data
// NOTE: This file is swap-ready for production Supabase Auth — replace with Supabase wrapper only. Do not change callsites.
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { useQuery } from '@tanstack/react-query';
import { levelSchema } from '@/lib/validation/levels.schema';
import { Level } from '@/lib/types/index';
import { handleError, logError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { getCurrentUser } from '@/services/authService';

export function useLevels() {
  const { error: showError } = useToastExt();

  const query = useQuery({
    queryKey: ['levels'],
    queryFn: async (): Promise<Level[]> => {
      try {
        // Include auth context for admin-specific data
        const user = await getCurrentUser();
        
        const response = await fetch('/api/levels', {
          headers: {
            'Content-Type': 'application/json',
            // TODO: Add auth headers when real API is implemented
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch levels: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validate response using Zod schema
        const validationResult = levelSchema.array().safeParse(data);
        
        if (!validationResult.success) {
          const error = new Error('Level data validation failed');
          logError(error, { 
            component: 'useLevels',
            validationErrors: validationResult.error.errors,
            userId: user?.id 
          });
          showError('Data validation failed', 'Level data format is invalid');
          throw error;
        }

        return validationResult.data;
      } catch (error) {
        const { message } = handleError(error, { 
          component: 'useLevels',
          action: 'fetchLevels' 
        });
        showError('Failed to load levels', message);
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (levels rarely change)
    retry: 3,
  });

  const getAllLevels = async (): Promise<Level[]> => {
    if (query.data) {
      return query.data;
    }
    
    // Trigger refetch if no data
    const result = await query.refetch();
    return result.data || [];
  };

  const getLevelById = (id: string): Level | undefined => {
    return query.data?.find(level => level.id === id);
  };

  const getLevelByCode = (code: string): Level | undefined => {
    return query.data?.find(level => level.code === code);
  };

  return {
    data: query.data || [],
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    getAllLevels,
    getLevelById,
    getLevelByCode,
  };
}
