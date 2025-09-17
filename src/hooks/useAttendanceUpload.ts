import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

interface UploadAttendanceParams {
  serviceId: string;
  levelId: string;
  file: File;
}

interface PreviewAttendanceParams {
  uploadId: string;
}

interface ConfirmAttendanceParams {
  uploadId: string;
}

interface AttendancePreviewResult {
  summary: {
    total_records: number;
    matched_count: number;
    unmatched_count: number;
  };
  issues: Array<{
    unique_id: string;
    level: number;
    reason: string;
    raw_data: any;
  }>;
}

interface AttendanceConfirmResult {
  batchId: string;
  recordsProcessed: number;
  matchedCount: number;
  unmatchedCount: number;
}

export function useAttendanceUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({
      serviceId,
      levelId,
      file,
    }: UploadAttendanceParams) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("serviceId", serviceId);
      formData.append("levelId", levelId);

      const response = await fetch("/api/attendance/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "File uploaded successfully",
        description: "Ready for preview",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async ({
      uploadId,
    }: PreviewAttendanceParams): Promise<AttendancePreviewResult> => {
      const response = await fetch("/api/attendance/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uploadId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Preview failed");
      }

      const result = await response.json();
      return result.data;
    },
    onError: (error: Error) => {
      toast({
        title: "Preview failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({
      uploadId,
    }: ConfirmAttendanceParams): Promise<AttendanceConfirmResult> => {
      const response = await fetch("/api/attendance/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uploadId }),
      });

      const result = await response.json();

      if (!response.ok) {
        const error = new Error(result.error || "Confirmation failed");
        (error as any).canRetry = result.canRetry;
        throw error;
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast({
        title: "Attendance confirmed",
        description: `Successfully processed ${data.recordsProcessed} records (${data.matchedCount} matched, ${data.unmatchedCount} issues)`,
      });
    },
    onError: (error: Error & { canRetry?: boolean }) => {
      toast({
        title: "Confirmation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      const response = await fetch("/api/attendance/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uploadId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Cancel failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload cancelled",
        description: "Attendance upload has been cancelled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancel failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    // Upload phase
    uploadAttendance: uploadMutation.mutate,
    uploadAttendanceAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    // Preview phase
    previewAttendance: previewMutation.mutate,
    previewAttendanceAsync: previewMutation.mutateAsync,
    isPreviewing: previewMutation.isPending,
    previewData: previewMutation.data,
    previewError: previewMutation.error,

    // Confirm phase
    confirmAttendance: confirmMutation.mutate,
    confirmAttendanceAsync: confirmMutation.mutateAsync,
    isConfirming: confirmMutation.isPending,
    confirmError: confirmMutation.error,
    canRetry: (confirmMutation.error as any)?.canRetry ?? false,

    // Cancel
    cancelUpload: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,

    // Reset states
    reset: () => {
      uploadMutation.reset();
      previewMutation.reset();
      confirmMutation.reset();
      cancelMutation.reset();
    },
  };
}
