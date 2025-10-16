"use client";

import { useState } from "react";
import { useAttendanceIssues } from "@/hooks/useAttendanceData";
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
import { AlertTriangle, RefreshCw } from "lucide-react";
import { UIStateWrapper } from "@/components/ui-states/UIStateWrapper";
import { Eye } from "lucide-react";
import { RawDataModal } from "@/components/ui/raw-data-modal";
import { parseRawData } from "@/lib/utils/parse-raw-data";

interface AttendanceIssuesTabProps {
  serviceId?: string;
  levelId?: string;
}

export function AttendanceIssuesTab({
  serviceId,
  levelId,
}: AttendanceIssuesTabProps) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useAttendanceIssues({
    page,
    limit,
    service_id: serviceId,
    level_id: levelId,
  });

  // API returns { success: true, data: [...], meta: { pagination: {...} } }
  const issues = data?.data || [];
  const pagination = data?.meta?.pagination;

  const handleRefresh = () => {
    refetch();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  const [selectedIssue, setSelectedIssue] = useState<{ rawData: any } | null>(
    null
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Attendance Issues
            {issues.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {issues.length}
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
          error={isError ? new Error("Failed to load attendance issues") : null}
          data={issues}
          emptyTitle="No issues found"
          emptyMessage={
            serviceId && levelId
              ? "No attendance issues found for this service and level."
              : "Select a service and level to view attendance issues."
          }
          onRetry={refetch}
          loadingMessage="Loading attendance issues..."
        >
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {issue.student?.first_name} {issue.student?.last_name}
                        </div>
                        {issue.student?.matric_number && (
                          <div className="text-sm text-muted-foreground">
                            {issue.student.matric_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.issue_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div
                        className="truncate"
                        title={issue.issue_description || ""}
                      >
                        {issue.issue_description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={issue.resolved ? "default" : "destructive"}
                      >
                        {issue.resolved ? "Resolved" : "Open"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {issue.attendance_batch && (
                        <div className="text-sm">
                          <div>
                            Version {issue.attendance_batch.version_number}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            ID: {issue.attendance_batch.id.slice(0, 8)}...
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {issue.created_at
                          ? new Date(issue.created_at).toLocaleDateString()
                          : "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSelectedIssue({ rawData: issue.raw_data })
                        }
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View raw data</span>
                      </Button>
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
      <RawDataModal
        data={selectedIssue ? parseRawData(selectedIssue.rawData) : null}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
    </Card>
  );
}
