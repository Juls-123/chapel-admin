import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/auth/supabase';
import { useToast } from './use-toast';

export interface WarningLetterSummary {
  matric_number: string;
  student_name: string;
  week_start: Date;
  miss_count: number;
  status: 'none' | 'pending' | 'sent';
  first_created_at?: string;
  last_updated_at?: string;
  sent_at?: string;
  sent_by?: string;
  student_details: {
    id: string;
    email?: string;
    parent_email?: string;
    parent_phone?: string;
    gender?: string;
    department?: string;
    level?: number;
    level_name?: string;
  };
}

export interface WarningsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WarningsResponse {
  data: WarningLetterSummary[];
  pagination: WarningsPagination;
}

export interface WarningsFilters {
  week_start?: string;
  status?: 'none' | 'pending' | 'sent';
  page?: number;
  limit?: number;
}

export interface GenerateWarningsRequest {
  week_start: string;
  threshold?: number;
}

export interface UpdateWarningRequest {
  matric_number: string;
  status: 'pending' | 'sent';
}

export interface BulkUpdateWarningsRequest {
  week_start: string;
  status: 'sent';
}

export interface GeneratePDFRequest {
  matric_number: string;
  week_start: string;
}

// Helper function to format date for API
const formatDateForAPI = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Ensure we have a valid date
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
  
  // PostgreSQL date type expects YYYY-MM-DD format
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Helper function to validate query parameters
const validateQueryParams = (filters: WarningsFilters) => {
  const errors: string[] = [];
  
  if (filters.week_start) {
    try {
      const formatted = formatDateForAPI(filters.week_start);
      console.log('✅ Date validation passed:', filters.week_start, '->', formatted);
    } catch (error) {
      errors.push(`Invalid week_start date: ${error}`);
    }
  }
  
  if (filters.status && !['none', 'pending', 'sent'].includes(filters.status)) {
    errors.push(`Invalid status: ${filters.status}. Must be 'none', 'pending', or 'sent'`);
  }
  
  if (filters.page && (isNaN(Number(filters.page)) || Number(filters.page) < 1)) {
    errors.push(`Invalid page: ${filters.page}. Must be a positive integer`);
  }
  
  if (filters.limit && (isNaN(Number(filters.limit)) || Number(filters.limit) < 1 || Number(filters.limit) > 100)) {
    errors.push(`Invalid limit: ${filters.limit}. Must be between 1 and 100`);
  }
  
  return errors;
};

// Test function to help debug API parameters
export const testWarningsAPI = async () => {
  console.log('🧪 Testing Warnings API with different parameter combinations...');
  
  const testCases = [
    { name: 'No parameters', filters: {} },
    { name: 'Only status', filters: { status: 'pending' as const } },
    { name: 'Only pagination', filters: { page: 1, limit: 10 } },
    { name: 'Current week', filters: { week_start: new Date().toISOString().split('T')[0] } },
    { name: 'Last Monday', filters: { week_start: getLastMonday() } },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('Parameters:', testCase.filters);
    
    try {
      const errors = validateQueryParams(testCase.filters);
      if (errors.length > 0) {
        console.log('❌ Validation errors:', errors);
        continue;
      }
      
      console.log('✅ Parameters valid, would make API call');
    } catch (error) {
      console.log('❌ Test failed:', error);
    }
  }
};

// Helper to get last Monday's date
const getLastMonday = (): string => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysToSubtract);
  return formatDateForAPI(lastMonday.toISOString());
};

export function useWarnings(filters: WarningsFilters = {}) {
  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const queryKey = ['warnings', filters];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<WarningsResponse> => {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Validate parameters before making the request
      const validationErrors = validateQueryParams(filters);
      if (validationErrors.length > 0) {
        console.error('❌ Parameter validation failed:', validationErrors);
        throw new Error(`Invalid parameters: ${validationErrors.join(', ')}`);
      }

      const params = new URLSearchParams();
      
      // Format date if provided
      if (filters.week_start) {
        const formattedDate = formatDateForAPI(filters.week_start);
        params.append('week_start', formattedDate);
        console.log('🗓️ Formatted date:', filters.week_start, '->', formattedDate);
      }
      
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const url = `/api/warnings?${params.toString()}`;
      console.log('🔍 Making request to:', url);
      console.log('📋 Request headers:', {
        'Authorization': `Bearer ${token.substring(0, 20)}...`,
        'Content-Type': 'application/json',
      });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📨 Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ API Error Response:', errorData);
        } catch {
          errorData = {};
          console.error('❌ Failed to parse error response');
        }
        
        // Log the full response for debugging
        console.error('❌ Full error context:', {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });
        
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Response:', data);
      
      // Transform dates from strings to Date objects
      return {
        ...data,
        data: data.data.map((warning: any) => ({
          ...warning,
          week_start: new Date(warning.week_start),
        })),
      };
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error.message.includes('HTTP 4')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useGenerateWarnings() {
  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: GenerateWarningsRequest) => {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Format the date in the request
      const formattedRequest = {
        ...request,
        week_start: formatDateForAPI(request.week_start),
      };

      console.log('🚀 Generate warnings request:', formattedRequest);

      const response = await fetch('/api/warnings/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Generate warnings error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate warnings queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['warnings'] });
      
      toast({
        title: 'Warning Letters Generated',
        description: `Generated ${data.data.generated} new warnings, updated ${data.data.updated} existing warnings`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateWarning() {
  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateWarningRequest) => {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('📝 Update warning request:', request);

      const response = await fetch('/api/warnings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Update warning error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate warnings queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['warnings'] });
      
      const action = variables.status === 'sent' ? 'sent' : 'updated';
      toast({
        title: `Warning Letter ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        description: `Warning letter for ${variables.matric_number} has been ${action}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useBulkUpdateWarnings() {
  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkUpdateWarningsRequest) => {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Format the date in the request
      const formattedRequest = {
        ...request,
        week_start: formatDateForAPI(request.week_start),
      };

      console.log('📦 Bulk update request:', formattedRequest);

      const response = await fetch('/api/warnings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Bulk update error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate warnings queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['warnings'] });
      
      toast({
        title: 'Bulk Update Successful',
        description: `${data.count} warning letters have been marked as sent`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useGeneratePDF() {
  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: GeneratePDFRequest): Promise<Blob> => {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Format the date in the request
      const formattedRequest = {
        ...request,
        week_start: formatDateForAPI(request.week_start),
      };

      console.log('📄 Generate PDF request:', formattedRequest);

      const response = await fetch('/api/warnings/pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ PDF generation error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.blob();
    },
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `warning-letter-${variables.matric_number}-${variables.week_start}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'PDF Generated',
        description: `Warning letter PDF for ${variables.matric_number} has been downloaded`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'PDF Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Helper hook for managing warning filters
export function useWarningFilters() {
  const queryClient = useQueryClient();

  const updateFilters = (newFilters: Partial<WarningsFilters>) => {
    // This would typically be managed by URL params or state management
    // For now, we'll invalidate queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['warnings'] });
  };

  return { updateFilters };
}

// Hook for getting warning statistics
export function useWarningStats(weekStart?: string) {
  const { data: warnings, isLoading } = useWarnings({ 
    week_start: weekStart,
    limit: 100 // API maximum limit
  });

  const stats = {
    total: warnings?.data.length || 0,
    pending: warnings?.data.filter(w => w.status === 'pending').length || 0,
    sent: warnings?.data.filter(w => w.status === 'sent').length || 0,
    highRisk: warnings?.data.filter(w => w.miss_count >= 3).length || 0,
  };

  return { stats, isLoading };
}