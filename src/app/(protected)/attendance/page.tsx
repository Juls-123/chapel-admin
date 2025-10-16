"use client";

import React, { useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AttendanceUploadForm,
  UploadState,
} from "@/components/attendance/AttendanceUploadForm";
import { AttendanceIssuesTab } from "@/components/attendance/AttendanceIssuesTab";
import { AttendanceUploadHistory } from "@/components/attendance/AttendanceUploadHistory";
import { getAuthHeaders } from "@/lib/auth";

export default function AttendanceUploadPage() {
  const { toast } = useToast();
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");

  const handleFileUpload = useCallback(
    async (file: File, serviceId: string, levelId: string) => {
      setUploadState({ status: "uploading" });
      setSelectedServiceId(serviceId);
      setSelectedLevelId(levelId);

      try {
        // Step 1: Upload file to storage
        const formData = new FormData();
        formData.append("file", file);
        formData.append("serviceId", serviceId);
        formData.append("levelId", levelId);

        const uploadResponse = await fetch("/api/attendance/upload", {
          method: "POST",
          headers: await getAuthHeaders(),
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`
          );
        }

        const uploadResult = await uploadResponse.json();
        const uploadId = uploadResult.data.uploadId;

        // Step 2: Get preview data
        setUploadState({ status: "processing" });

        const previewResponse = await fetch("/api/attendance/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify({ uploadId }),
        });

        if (!previewResponse.ok) {
          const errorData = await previewResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `HTTP ${previewResponse.status}: ${previewResponse.statusText}`
          );
        }

        const previewResult = await previewResponse.json();

        // Set preview state with issues data
        setUploadState({
          status: "preview",
          uploadId: uploadId,
          preview: {
            matched: [], // Not needed for UI, we only show issues
            unmatched: previewResult.data.issues,
            summary: previewResult.data.summary,
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        setUploadState({
          status: "error",
          error: errorMessage,
        });

        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleConfirmUpload = useCallback(async () => {
    if (!uploadState.uploadId) {
      toast({
        title: "Error",
        description: "No upload to confirm",
        variant: "destructive",
      });
      return;
    }

    setUploadState((prev) => ({ ...prev, status: "confirming" }));

    try {
      const response = await fetch("/api/attendance/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ uploadId: uploadState.uploadId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
        (error as any).canRetry = errorData.canRetry;
        throw error;
      }

      const result = await response.json();
      setUploadState({ status: "completed" });

      toast({
        title: "Upload Confirmed",
        description: `Successfully processed ${result.data.recordsProcessed} records (${result.data.matchedCount} matched, ${result.data.unmatchedCount} issues)`,
      });
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "Confirmation failed";
      setUploadState((prev) => ({
        ...prev,
        status: "error",
        error: errorMessage,
        canRetry: error.canRetry,
      }));

      toast({
        title: "Confirmation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [uploadState.uploadId, toast]);

  const handleUploadStateChange = useCallback((state: UploadState) => {
    setUploadState(state);
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Attendance Management"
        description="Upload and manage attendance data for chapel services."
      />

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload Attendance</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <AttendanceUploadForm
            uploadState={uploadState}
            onUploadStateChange={handleUploadStateChange}
            onFileUpload={handleFileUpload}
            onConfirmUpload={handleConfirmUpload}
          />
        </TabsContent>

        <TabsContent value="issues">
          <AttendanceIssuesTab
            serviceId={selectedServiceId || undefined}
            levelId={selectedLevelId || undefined}
          />
        </TabsContent>

        <TabsContent value="history">
          <AttendanceUploadHistory
            serviceId={selectedServiceId || undefined}
            levelId={selectedLevelId || undefined}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
