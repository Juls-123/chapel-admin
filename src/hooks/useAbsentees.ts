// src/hooks/useAbsentees.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { useEffect } from "react";
import type {
  ServiceWithAbsenteeCounts,
} from "@/services/AbsenteesService";
import type { PaginatedAbsentees } from "@/lib/utils/absentees-helpers";

/**
 * API response types
 */
interface ServicesResponse {
  success: boolean;
  data: ServiceWithAbsenteeCounts[];
  meta: {
    date: string;
    count: number;
  };
}

interface AbsenteesResponse {
  success: boolean;
  data: PaginatedAbsentees["data"];
  pagination: PaginatedAbsentees["pagination"];
  summary: PaginatedAbsentees["summary"];
}

/**
 * Fetch services for a specific date with absentee counts
 */
async function fetchServicesWithCounts(
  date: string
): Promise<ServiceWithAbsenteeCounts[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/absentees/services?date=${date}`, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch services");
  }

  const data: ServicesResponse = await response.json();
  return data.data;
}

/**
 * Fetch absentees for a specific service with pagination
 */
async function fetchAbsentees(
  serviceId: string,
  page: number,
  pageSize: number
): Promise<AbsenteesResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/absentees/${serviceId}?page=${page}&pageSize=${pageSize}`,
    {
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch absentees");
  }

  return response.json();
}

/**
 * Hook to fetch services with absentee counts for a specific date
 */
export function useServicesWithCounts(date: string | null) {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["absentees", "services", date],
    queryFn: () => fetchServicesWithCounts(date!),
    enabled: !!date && /^\d{4}-\d{2}-\d{2}$/.test(date),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: "Error fetching services",
        description: (query.error as Error).message,
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

/**
 * Hook to fetch paginated absentees for a specific service
 */
export function useAbsentees(
  serviceId: string | null,
  page: number = 1,
  pageSize: number = 20
) {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["absentees", serviceId, page, pageSize],
    queryFn: () => fetchAbsentees(serviceId!, page, pageSize),
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous page data while fetching new page
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: "Error fetching absentees",
        description: (query.error as Error).message,
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

/**
 * Hook to prefetch next page of absentees
 */
export function usePrefetchAbsentees() {
  const queryClient = useQueryClient();

  return (serviceId: string, page: number, pageSize: number) => {
    queryClient.prefetchQuery({
      queryKey: ["absentees", serviceId, page, pageSize],
      queryFn: () => fetchAbsentees(serviceId, page, pageSize),
    });
  };
}