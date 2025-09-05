import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Semester } from '@/lib/types/index';
import { useToastExt } from './useToastExt';
import { api } from '@/lib/requestFactory';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CreateSemesterData {
  name: string;
  start_date: string;
  end_date: string;
}

interface UpdateSemesterData {
  name?: string;
  start_date?: string;
  end_date?: string;
}

export function useSemesters() {
  const { success: showSuccess, error: showError } = useToastExt();
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('semesters-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'semesters'
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['semesters'] });
        
        // Show toast notifications for realtime changes
        if (payload.eventType === 'INSERT') {
          showSuccess('Semester Added', `New semester "${(payload.new as any)?.name || 'Unknown'}" has been created.`);
        } else if (payload.eventType === 'UPDATE') {
          showSuccess('Semester Updated', `Semester "${(payload.new as any)?.name || 'Unknown'}" has been updated.`);
        } else if (payload.eventType === 'DELETE') {
          showSuccess('Semester Deleted', `A semester has been deleted.`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, showSuccess]);

  const query = useQuery({
    queryKey: ['semesters'],
    queryFn: async (): Promise<Semester[]> => {
      const data = await api.get<Semester[]>('/api/semesters');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Create semester mutation
  const createMutation = useMutation({
    mutationFn: async (semesterData: CreateSemesterData) => {
      return await api.post<Semester>('/api/semesters', semesterData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
    },
    onError: (error: any) => {
      showError('Failed to create semester', error.message || 'Please try again.');
    },
  });

  // Update semester mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateSemesterData & { id: string }) => {
      return await api.put<Semester>(`/api/semesters/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
    },
    onError: (error: any) => {
      showError('Failed to update semester', error.message || 'Please try again.');
    },
  });

  // Delete semester mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/semesters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
    },
    onError: (error: any) => {
      showError('Failed to delete semester', error.message || 'Please try again.');
    },
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
    // Data and query state
    data: query.data || [],
    semesters: query.data || [],
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    
    // Mutations
    createSemester: createMutation.mutate,
    updateSemester: updateMutation.mutate,
    deleteSemester: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Helper functions
    getAllSemesters,
    getSemesterById,
    getCurrentSemester,
    getActiveSemesters,
  };
}
