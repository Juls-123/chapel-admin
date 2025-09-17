"use client";

import { useState } from "react";
import { useAttendanceUploads } from "@/hooks/useAttendanceData";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, RefreshCw } from "lucide-react";
import { UIStateWrapper } from "@/components/ui-states/UIStateWrapper";

interface AttendanceUploadHistoryProps {
  serviceId?: string;
  levelId?: string;
}

export function AttendanceUploadHistory({
  serviceId,
  levelId,
}: AttendanceUploadHistoryProps) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useAttendanceUploads({
    page,
    limit,
    service_id: serviceId,
    level_id: levelId,
  });

  // Fix data parsing - the API returns { success: true, data: [...], meta: { pagination: {...} } }
  const uploads = data?.data || [];
  const pagination = data?.meta?.pagination;

  const handleRefresh = () => {
    refetch();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const getServiceDisplayName = (upload: (typeof uploads)[0]) => {
    if (!upload.service) return "Unknown Service";

    const { service } = upload;
    if (service.name) return service.name;

    if (service.service_type === "devotion") {
      return `${
        service.devotion_type === "evening" ? "Evening" : "Morning"
      } Devotion`;
    }

    return "Special Service";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload History
            {uploads.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {uploads.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <UIStateWrapper
          isLoading={isLoading}
          error={isError ? new Error("Failed to load upload history") : null}
          data={uploads}
          emptyTitle="No uploads found"
          emptyMessage={
            serviceId && levelId
              ? "No attendance uploads found for this service and level."
              : "Select a service and level to view upload history."
          }
          onRetry={refetch}
          loadingMessage="Loading upload history..."
        >
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uploader</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {upload.uploader?.first_name}{" "}
                          {upload.uploader?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {upload.uploader?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {getServiceDisplayName(upload)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {upload.service?.service_date
                            ? new Date(
                                upload.service.service_date
                              ).toLocaleDateString()
                            : "Unknown date"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {upload.level?.name || "Unknown Level"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {upload.level?.code || "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {upload.uploaded_at
                          ? new Date(upload.uploaded_at).toLocaleString()
                          : "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {upload.file_hash}
                        </div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {upload.storage_path}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </UIStateWrapper>
      </CardContent>
    </Card>
  );
}
