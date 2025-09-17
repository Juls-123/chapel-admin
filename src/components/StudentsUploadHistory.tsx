"use client";

import { useState } from "react";
import {
  useStudentUploads,
  useStudentUploadErrors,
} from "@/hooks/useStudentUploads";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { UIStateWrapper } from "@/components/ui-states/UIStateWrapper";

export function StudentsUploadHistory() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [errorsOpen, setErrorsOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useStudentUploads({
    page,
    limit,
  });
  const rows = data?.data || [];
  const pagination = data?.pagination;

  const { data: errorsRes, isLoading: loadingErrors } = useStudentUploadErrors(
    selectedUploadId || undefined
  );

  const errors =
    errorsRes && "data" in errorsRes
      ? errorsRes.data
      : (errorsRes as any[] | undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Student Upload History
          <Badge variant="outline" className="ml-2">
            students
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <UIStateWrapper
          isLoading={isLoading}
          error={isError ? new Error("Failed to load uploads") : null}
          data={rows}
          emptyTitle="No student uploads found"
          emptyMessage="No files have been uploaded yet"
          onRetry={refetch}
          loadingMessage="Loading student upload history..."
        >
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead>File Hash</TableHead>
                  <TableHead>Storage Path</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      {u.uploaded_at
                        ? format(new Date(u.uploaded_at), "PPpp")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {u.uploader
                        ? `${u.uploader.first_name} ${u.uploader.last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {u.file_hash}
                    </TableCell>
                    <TableCell className="text-xs break-all">
                      {u.storage_path}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUploadId(u.id);
                          setErrorsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </UIStateWrapper>
      </CardContent>

      {/* Errors Dialog */}
      <Dialog open={errorsOpen} onOpenChange={setErrorsOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Errors</DialogTitle>
            <DialogDescription>
              Validation and processing issues
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            {loadingErrors ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : !errors || errors.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No errors recorded for this upload.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Error Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Raw</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono">
                        {e.row_number}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.error_type}
                      </TableCell>
                      <TableCell className="text-sm">
                        {e.error_message}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[320px] truncate">
                        {typeof e.raw_data === "string"
                          ? e.raw_data
                          : JSON.stringify(e.raw_data)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
