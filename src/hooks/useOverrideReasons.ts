import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { handleError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { api } from '@/lib/requestFactory';
import { supabase } from '@/lib/auth/supabase';

interface OverrideReason {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  requires_note: boolean;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
  created_by_name: string;
}

interface CreateOverrideReasonData {
  code: string;
  display_name: string;
  description?: string;
  requires_note?: boolean;
}

interface UpdateOverrideReasonData {
  display_name?: string;
  description?: string;
  requires_note?: boolean;
  is_active?: boolean;
}

export function useOverrideReasons(activeOnly: boolean = true) {
  const { success: showSuccess, error: showError } = useToastExt();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['override-reasons', activeOnly],
    queryFn: async (): Promise<OverrideReason[]> => {
      try {
        const params = activeOnly ? '?active_only=true' : '';
        const data = await api.get<OverrideReason[]>(`/api/override-reasons${params}`);
        return data;
      } catch (error) {
        // Handle 404 or missing API endpoint gracefully
        if (error instanceof Error && error.message.includes('404')) {
          console.warn('Override reasons API endpoint not yet implemented, returning empty array');
          return [];
        }
        
        const { message } = handleError(error, { 
          component: 'useOverrideReasons',
          action: 'fetchOverrideReasons' 
        });
        showError(message);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Set up realtime subscription for override_reason_definitions table
  useEffect(() => {
    const channel = supabase
      .channel('override-reasons-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'override_reason_definitions'
        },
        (payload) => {
          console.log('🔄 Realtime override reason change detected:', payload);
          
          // Invalidate and refetch data
          queryClient.invalidateQueries({ queryKey: ['override-reasons'] });
          
          // Show toast notifications for different events
          switch (payload.eventType) {
            case 'INSERT':
              const newReason = payload.new as OverrideReason;
              showSuccess('New Override Reason Added', `"${newReason.display_name}" has been created`);
              break;
            case 'UPDATE':
              const updatedReason = payload.new as OverrideReason;
              showSuccess('Override Reason Updated', `"${updatedReason.display_name}" has been modified`);
              break;
            case 'DELETE':
              const deletedReason = payload.old as OverrideReason;
              showSuccess('Override Reason Removed', `"${deletedReason.display_name}" has been deactivated`);
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
    mutationFn: async (data: CreateOverrideReasonData): Promise<OverrideReason> => {
      const result = await api.post<OverrideReason>('/api/override-reasons', data);
      return result;
    },
    onSuccess: (newReason) => {
      queryClient.invalidateQueries({ queryKey: ['override-reasons'] });
      showSuccess('Override Reason Created', `"${newReason.display_name}" has been added successfully.`);
    },
    onError: (error: any) => {
      console.error('Create override reason error:', error);
      if (error.response?.data?.error && error.response?.data?.details) {
        showError(error.response.data.error, error.response.data.details);
      } else if (error.response?.data?.error) {
        showError('Failed to create override reason', error.response.data.error);
      } else {
        showError('Failed to create override reason', 'An unexpected error occurred. Please try again.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOverrideReasonData }): Promise<OverrideReason> => {
      const result = await api.put<OverrideReason>(`/api/override-reasons/${id}`, data);
      return result;
    },
    onSuccess: (updatedReason) => {
      queryClient.invalidateQueries({ queryKey: ['override-reasons'] });
      showSuccess('Override Reason Updated', `"${updatedReason.display_name}" has been updated successfully.`);
    },
    onError: (error: any) => {
      console.error('Update override reason error:', error);
      if (error.response?.data?.error && error.response?.data?.details) {
        showError(error.response.data.error, error.response.data.details);
      } else if (error.response?.data?.error) {
        showError('Failed to update override reason', error.response.data.error);
      } else {
        showError('Failed to update override reason', 'An unexpected error occurred. Please try again.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<{ message: string }> => {
      const result = await api.delete<{ message: string }>(`/api/override-reasons/${id}`);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['override-reasons'] });
      showSuccess('Override Reason Deleted', result.message);
    },
    onError: (error: any) => {
      console.error('Delete override reason error:', error);
      if (error.response?.data?.error && error.response?.data?.details) {
        showError(error.response.data.error, error.response.data.details);
      } else if (error.response?.data?.error) {
        showError('Failed to delete override reason', error.response.data.error);
      } else {
        showError('Failed to delete override reason', 'An unexpected error occurred. Please try again.');
      }
    },
  });

  return {
    overrideReasons: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createOverrideReason: createMutation.mutate,
    updateOverrideReason: updateMutation.mutate,
    deleteOverrideReason: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: query.refetch,
  };
}
