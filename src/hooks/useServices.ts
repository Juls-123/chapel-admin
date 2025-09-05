import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useEffect } from 'react';
import { getAuthHeaders } from '@/lib/auth';

// Types based on database schema
export interface Service {
  id: string;
  type: 'morning' | 'evening' | 'special';
  name?: string;
  service_date: string;
  status: 'scheduled' | 'active' | 'completed' | 'canceled';
  created_by: string;
  created_at: string;
  locked_after_ingestion: boolean;
  applicable_levels?: string[];
  service_levels?: ServiceLevel[];
}

export interface ServiceLevel {
  id: string;
  service_id: string;
  level_id: string;
  constraints?: Record<string, any>;
}

export interface CreateServiceData {
  type: 'morning' | 'evening' | 'special';
  name?: string;
  service_date: string;
  applicable_levels?: string[];
  constraints?: Record<string, any>;
}

export interface ServiceFilters {
  page?: number;
  limit?: number;
  type?: 'morning' | 'evening' | 'special';
  status?: 'scheduled' | 'active' | 'completed' | 'canceled';
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ServicesResponse {
  data: Service[];
  pagination: PaginationInfo;
}

// API functions
async function fetchServices(filters: ServiceFilters = {}): Promise<ServicesResponse> {
  const searchParams = new URLSearchParams();
  
  if (filters.type) searchParams.append('type', filters.type);
  if (filters.status) searchParams.append('status', filters.status);
  if (filters.date_from) searchParams.append('dateFrom', filters.date_from);
  if (filters.date_to) searchParams.append('dateTo', filters.date_to);
  if (filters.search) searchParams.append('search', filters.search);
  if (filters.page) searchParams.append('page', filters.page.toString());
  if (filters.limit) searchParams.append('limit', filters.limit.toString());

  const headers = await getAuthHeaders();
  const response = await fetch(`/api/services?${searchParams}`, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to fetch services');
  }

  return response.json();
}

async function createService(serviceData: CreateServiceData): Promise<Service> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/services', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(serviceData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to create service');
  }

  const result = await response.json();
  return result.data;
}

async function fetchService(id: string): Promise<Service> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/services/${id}`, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to fetch service');
  }

  const result = await response.json();
  return result.data;
}

async function updateService(id: string, serviceData: Partial<CreateServiceData>): Promise<Service> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/services/${id}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(serviceData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to update service');
  }

  const result = await response.json();
  return result.data;
}

async function deleteService(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/services/${id}`, {
    method: 'DELETE',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to delete service');
  }
}

// Hooks
export function useServices(filters: ServiceFilters = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['services', filters],
    queryFn: () => fetchServices(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();

  // Handle errors with toast in useEffect to avoid setState during render
  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Error fetching services',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  return {
    services: query.data?.data || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createService: createServiceMutation.mutate,
    isCreating: createServiceMutation.isPending,
    updateService: updateServiceMutation.mutate,
    isUpdating: updateServiceMutation.isPending,
    deleteService: deleteServiceMutation.mutate,
    isDeleting: deleteServiceMutation.isPending,
    // Legacy API for existing components
    performAction: async (params: { id: string; action: any }) => {
      if (params.action.action === 'cancel') {
        return deleteServiceMutation.mutateAsync(params.id);
      }
      // Add other actions as needed
      throw new Error('Action not implemented');
    },
    isPerformingAction: deleteServiceMutation.isPending,
  };
}

export function useService(id: string) {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['service', id],
    queryFn: () => fetchService(id),
    enabled: !!id,
  });

  // Handle errors with toast in useEffect to avoid setState during render
  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Error fetching service',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  return query;
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createService,
    onSuccess: (newService) => {
      // Invalidate and refetch services list
      queryClient.invalidateQueries({ queryKey: ['services'] });
      
      toast({
        title: 'Service created',
        description: `${newService.type} service for ${newService.service_date} created successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating service',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateServiceData> }) =>
      updateService(id, data),
    onSuccess: (updatedService) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service', updatedService.id] });
      
      toast({
        title: 'Service updated',
        description: 'Service updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating service',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      // Invalidate and refetch services list
      queryClient.invalidateQueries({ queryKey: ['services'] });
      
      toast({
        title: 'Service canceled',
        description: 'Service canceled successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error canceling service',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
