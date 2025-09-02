// Read-only hook for fetching services data
// NOTE: This file is swap-ready for production Supabase Auth — replace with Supabase wrapper only. Do not change callsites.
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { useQuery } from '@tanstack/react-query';
import { serviceSchema } from '@/lib/validation/services.schema';
import { Service } from '@/lib/types/index';
import { handleError, logError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { getCurrentUser } from '@/services/authService';

export function useServices() {
  const { error: showError } = useToastExt();

  const query = useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => {
      try {
        // Include auth context for admin-specific data
        const user = await getCurrentUser();
        
        const response = await fetch('/api/services', {
          headers: {
            'Content-Type': 'application/json',
            // TODO: Add auth headers when real API is implemented
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch services: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validate response using Zod schema
        const validationResult = serviceSchema.array().safeParse(data);
        
        if (!validationResult.success) {
          const error = new Error('Service data validation failed');
          logError(error, { 
            component: 'useServices',
            validationErrors: validationResult.error.errors,
            userId: user?.id 
          });
          showError('Data validation failed', 'Service data format is invalid');
          throw error;
        }

        return validationResult.data;
      } catch (error) {
        const { message } = handleError(error, { 
          component: 'useServices',
          action: 'fetchServices' 
        });
        showError('Failed to load services', message);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const getAllServices = async (): Promise<Service[]> => {
    if (query.data) {
      return query.data;
    }
    
    // Trigger refetch if no data
    const result = await query.refetch();
    return result.data || [];
  };

  const getServiceById = (id: string): Service | undefined => {
    return query.data?.find((service: Service) => service.id === id);
  };

  const getServicesByDate = (date: string): Service[] => {
    return query.data?.filter((service: Service) => service.service_date === date) || [];
  };

  const getServicesByType = (type: 'morning' | 'evening' | 'special'): Service[] => {
    return query.data?.filter((service: Service) => service.type === type) || [];
  };

  return {
    data: query.data || [],
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    getAllServices,
    getServiceById,
    getServicesByDate,
    getServicesByType,
  };
}
