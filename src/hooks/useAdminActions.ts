import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useToastExt } from './useToastExt';
import { api } from '@/lib/requestFactory';
import { supabase } from '@/lib/auth/supabase';

export interface AdminAction {
  id: string;
  admin_id: string;
  action: string;
  object_type?: string;
  object_id?: string;
  object_label?: string;
  details?: Record<string, any>;
  created_at: string;
  admin_name: string;
}

export interface CreateAdminActionData {
  action: string;
  object_type?: string;
  object_id?: string;
  object_label?: string;
  details?: Record<string, any>;
}

export function useAdminActions(limit: number = 50, offset: number = 0) {
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToastExt();

  // Query for fetching admin actions
  const query = useQuery({
    queryKey: ['admin-actions', limit, offset],
    queryFn: async (): Promise<AdminAction[]> => {
      const result = await api.get<AdminAction[]>(`/api/admin-actions?limit=${limit}&offset=${offset}`);
      return result;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Real-time subscription for admin actions
  useEffect(() => {
    const channel = supabase
      .channel('admin_actions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_actions',
        },
        () => {
          // Invalidate and refetch admin actions when changes occur
          queryClient.invalidateQueries({ queryKey: ['admin-actions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mutation for creating admin actions
  const createMutation = useMutation({
    mutationFn: async (data: CreateAdminActionData): Promise<AdminAction> => {
      const result = await api.post<AdminAction>('/api/admin-actions', data);
      return result;
    },
    onSuccess: (newAction) => {
      queryClient.invalidateQueries({ queryKey: ['admin-actions'] });
      showSuccess('Action Logged', `Action "${newAction.action}" has been logged successfully.`);
    },
    onError: (error: any) => {
      console.error('Create admin action error:', error);
      if (error.response?.data?.error && error.response?.data?.details) {
        showError(error.response.data.error, error.response.data.details);
      } else if (error.response?.data?.error) {
        showError('Failed to log action', error.response.data.error);
      } else {
        showError('Failed to log action', 'An unexpected error occurred. Please try again.');
      }
    },
  });

  return {
    adminActions: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createAdminAction: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
