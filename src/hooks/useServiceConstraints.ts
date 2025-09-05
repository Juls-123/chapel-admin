import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { handleError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { api } from '@/lib/requestFactory';
import { supabase } from '@/lib/auth/supabase';

interface ServiceConstraint {
  id: string;
  name: string;
  constraint_rule: Record<string, any>;
  description: string | null;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
  created_by_name: string;
}

interface CreateServiceConstraintData {
  name: string;
  constraint_rule: Record<string, any>;
  description?: string;
}

interface UpdateServiceConstraintData {
  name?: string;
  constraint_rule?: Record<string, any>;
  description?: string;
  is_active?: boolean;
}

export function useServiceConstraints(activeOnly: boolean = true) {
  const { success: showSuccess, error: showError } = useToastExt();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['service-constraints', activeOnly],
    queryFn: async (): Promise<ServiceConstraint[]> => {
      try {
        const params = activeOnly ? '?active_only=true' : '';
        const data = await api.get<ServiceConstraint[]>(`/api/service-constraints${params}`);
        return data;
      } catch (error) {
        // Handle 404 or missing API endpoint gracefully
        if (error instanceof Error && error.message.includes('404')) {
          console.warn('Service constraints API endpoint not yet implemented, returning empty array');
          return [];
        }
        
        const { message } = handleError(error, { 
          component: 'useServiceConstraints',
          action: 'fetchServiceConstraints' 
        });
        showError(message);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Set up realtime subscription for service_constraint_definitions table
  useEffect(() => {
    const channel = supabase
      .channel('service-constraints-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_constraint_definitions'
        },
        (payload) => {
          console.log('🔄 Realtime service constraint change detected:', payload);
          
          // Invalidate and refetch data
          queryClient.invalidateQueries({ queryKey: ['service-constraints'] });
          
          // Show toast notifications for different events
          switch (payload.eventType) {
            case 'INSERT':
              const newConstraint = payload.new as ServiceConstraint;
              showSuccess('New Service Constraint Added', `"${newConstraint.name}" has been created`);
              break;
            case 'UPDATE':
              const updatedConstraint = payload.new as ServiceConstraint;
              showSuccess('Service Constraint Updated', `"${updatedConstraint.name}" has been modified`);
              break;
            case 'DELETE':
              const deletedConstraint = payload.old as ServiceConstraint;
              showSuccess('Service Constraint Removed', `"${deletedConstraint.name}" has been deactivated`);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, showSuccess]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateServiceConstraintData): Promise<ServiceConstraint> => {
      const result = await api.post<ServiceConstraint>('/api/service-constraints', data);
      return result;
    },
    onSuccess: (newConstraint) => {
      queryClient.invalidateQueries({ queryKey: ['service-constraints'] });
      showSuccess('Service Constraint Created', `"${newConstraint.name}" has been added successfully.`);
    },
    onError: (error) => {
      const { message } = handleError(error, { 
        component: 'useServiceConstraints',
        action: 'createServiceConstraint' 
      });
      showError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateServiceConstraintData }): Promise<ServiceConstraint> => {
      const result = await api.put<ServiceConstraint>(`/api/service-constraints/${id}`, data);
      return result;
    },
    onSuccess: (updatedConstraint) => {
      queryClient.invalidateQueries({ queryKey: ['service-constraints'] });
      showSuccess('Service Constraint Updated', `"${updatedConstraint.name}" has been updated successfully.`);
    },
    onError: (error) => {
      const { message } = handleError(error, { 
        component: 'useServiceConstraints',
        action: 'updateServiceConstraint' 
      });
      showError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<{ message: string }> => {
      const result = await api.delete<{ message: string }>(`/api/service-constraints/${id}`);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['service-constraints'] });
      showSuccess('Service Constraint Deactivated', result.message);
    },
    onError: (error) => {
      const { message } = handleError(error, { 
        component: 'useServiceConstraints',
        action: 'deleteServiceConstraint' 
      });
      showError(message);
    },
  });

  return {
    serviceConstraints: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createServiceConstraint: createMutation.mutate,
    updateServiceConstraint: updateMutation.mutate,
    deleteServiceConstraint: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: query.refetch,
  };
}
