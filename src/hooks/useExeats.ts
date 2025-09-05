import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/requestFactory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/auth/supabase';
import { getAuthHeaders } from '@/lib/auth';

// Types
export interface Exeat {
  id: string;
  student_id: string;
  student_name: string;
  matric_number: string;
  level?: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'active' | 'ended' | 'canceled';
  derived_status: 'active' | 'upcoming' | 'past' | 'canceled' | 'ended';
  created_by: string;
  created_at: string;
}

export interface ExeatsResponse {
  data: Exeat[];
  pagination: {
    currentPage: number;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateExeatData {
  student_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface UpdateExeatData {
  start_date?: string;
  end_date?: string;
  reason?: string;
  status?: 'active' | 'ended' | 'canceled';
}

export interface ExeatFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'ended' | 'canceled';
  student_id?: string;
  search?: string;
  start_date_from?: string;
  start_date_to?: string;
}

export function useExeats(filters: ExeatFilters = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for fetching exeats
  const query = useQuery({
    queryKey: ['exeats', filters],
    queryFn: async (): Promise<ExeatsResponse> => {
      const searchParams = new URLSearchParams();
      
      if (filters.page) searchParams.set('page', filters.page.toString());
      if (filters.limit) searchParams.set('limit', filters.limit.toString());
      if (filters.status) searchParams.set('status', filters.status);
      if (filters.student_id) searchParams.set('student_id', filters.student_id);
      if (filters.search) searchParams.set('search', filters.search);
      if (filters.start_date_from) searchParams.set('start_date_from', filters.start_date_from);
      if (filters.start_date_to) searchParams.set('start_date_to', filters.start_date_to);

      console.log('🔍 Exeats API Query:', {
        url: `/api/exeats?${searchParams.toString()}`,
        params: Object.fromEntries(searchParams.entries())
      });

      // Make direct fetch call to get the full response structure
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/exeats?${searchParams.toString()}`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to fetch exeats');
      }

      const result = await response.json();
      
      console.log('📊 Exeats API Response:', {
        responseType: typeof result,
        hasDataProperty: 'data' in result,
        hasPaginationProperty: 'pagination' in result,
        responseKeys: Object.keys(result),
        dataCount: result?.data?.length || 0
      });

      // Validate response structure
      if (result && typeof result === 'object' && 'data' in result && 'pagination' in result) {
        // Ensure pagination has currentPage field
        const response = result as ExeatsResponse;
        if (!response.pagination.currentPage) {
          response.pagination.currentPage = response.pagination.page;
        }
        return response;
      }

      // If the response doesn't match expected structure, throw an error
      throw new Error('Invalid API response structure');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Real-time subscription for exeats updates
  useEffect(() => {
    const channel = supabase
      .channel('exeats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exeats'
        },
        (payload: any) => {
          console.log('🔄 Real-time exeats update:', payload);
          // Invalidate and refetch exeats data
          queryClient.invalidateQueries({ queryKey: ['exeats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create exeat mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateExeatData): Promise<Exeat> => {
      const result = await api.post<Exeat>('/api/exeats', data);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['exeats'] });
      toast({
        title: 'Exeat Created',
        description: 'The exeat has been successfully created.',
      });
    },
    onError: (error: any) => {
      console.error('Create exeat error:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create exeat',
        variant: 'destructive',
      });
    },
  });

  // Update exeat mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateExeatData }): Promise<Exeat> => {
      const result = await api.put<Exeat>(`/api/exeats/${id}`, data);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['exeats'] });
      toast({
        title: 'Exeat Updated',
        description: 'The exeat has been successfully updated.',
      });
    },
    onError: (error: any) => {
      console.error('Update exeat error:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update exeat',
        variant: 'destructive',
      });
    },
  });

  // Cancel exeat mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/exeats/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exeats'] });
      toast({
        title: 'Exeat Cancelled',
        description: 'The exeat has been successfully cancelled.',
      });
    },
    onError: (error: any) => {
      console.error('Cancel exeat error:', error);
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel exeat',
        variant: 'destructive',
      });
    },
  });

  return {
    // Query data
    exeats: query.data?.data || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Mutations
    createExeat: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateExeat: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    cancelExeat: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
  };
}

// Hook for fetching a single exeat
export function useExeat(id: string) {
  return useQuery({
    queryKey: ['exeat', id],
    queryFn: async (): Promise<Exeat> => {
      const result = await api.get<{ data: Exeat }>(`/api/exeats/${id}`);
      return result.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
