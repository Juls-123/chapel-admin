// Service attendance hook with manual clearance integration
// Handles all query logic for service attendance page with clean separation of concerns

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/requestFactory";
import type { Database } from "@/lib/types/generated";

// Type definitions
interface AttendanceRecord {
  unique_id: string;
  level: string | number;
  gender: string;
  student_id: string;
  matric_number: string;
  student_name: string;
  status: "present" | "absent" | "exempted";
  reason?: string; // For exempted students
}

interface AttendanceData {
  service_id: string;
  level_code: string;
  level_name: string;
  upload_id?: string;
  upload_date?: string;
  attendance: AttendanceRecord[];
  summary: {
    total_students: number;
    present: number;
    absent: number;
    exempted: number;
    percentage: number;
  };
  batches_processed?: number;
}

interface ManualClearance {
  student_id: string;
  matric_number: string;
  name: string;
  reason: string;
  cleared_by: string;
  cleared_at: string;
}

type ServiceWithLevels = Database["public"]["Tables"]["services"]["Row"] & {
  service_levels?: Array<{
    level: { code: string; name: string };
  }>;
};

interface UseServiceAttendanceOptions {
  serviceId: string;
  activeLevel: string;
}

export function useServiceAttendance({
  serviceId,
  activeLevel,
}: UseServiceAttendanceOptions) {
  // Fetch service details
  const serviceQuery = useQuery({
    queryKey: ["service", serviceId],
    queryFn: async (): Promise<ServiceWithLevels> => {
      const result = await api.get<ServiceWithLevels>(
        `/api/services/${serviceId}`
      );
      return result;
    },
    enabled: !!serviceId,
  });

  // Fetch attendance data for current level (now includes manually cleared students)
  const attendanceQuery = useQuery({
    queryKey: ["service-attendance", serviceId, activeLevel],
    queryFn: async (): Promise<AttendanceData> => {
      const result = await api.get<AttendanceData>(
        `/api/services/${serviceId}/attendance?level_code=${activeLevel}`
      );
      return result;
    },
    enabled: !!serviceId && !!activeLevel,
  });

  // No need for clearances query or processing anymore!
  // The attendance API now includes manually cleared students as exempted

  // Helper function to get service levels display
  const getServiceLevels = () => {
    if (!serviceQuery.data?.service_levels) return "All Levels";
    return serviceQuery.data.service_levels
      .map((sl) => `${sl.level.code}L`)
      .join(", ");
  };

  // Refetch functions
  const refetchAll = async () => {
    await Promise.all([serviceQuery.refetch(), attendanceQuery.refetch()]);
  };

  const refetchAttendance = async () => {
    await attendanceQuery.refetch();
  };

  return {
    // Service data
    service: serviceQuery.data,
    serviceLoading: serviceQuery.isLoading,
    serviceError: serviceQuery.error,

    // Attendance data (now includes manually cleared students)
    attendanceData: attendanceQuery.data,
    attendanceLoading: attendanceQuery.isLoading,
    attendanceError: attendanceQuery.error,

    // Helper functions
    getServiceLevels,

    // Refetch functions
    refetchAll,
    refetchAttendance,
    refetchService: serviceQuery.refetch,
  };
}

// Export types for use in components
export type {
  AttendanceRecord,
  AttendanceData,
  ManualClearance,
  ServiceWithLevels,
};
