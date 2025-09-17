"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useStudentUpload,
  useStudentUploadErrors,
} from "@/hooks/useStudentUploads";
import { format } from "date-fns";

export default function StudentUploadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const {
    data: detailRes,
    isLoading: loadingDetail,
    isError: errorDetail,
  } = useStudentUpload(params.id, true);
  const {
    data: errorsRes,
    isLoading: loadingErrors,
    isError: errorErrors,
  } = useStudentUploadErrors(params.id);

  const upload = (
    detailRes && "data" in detailRes ? detailRes.data : detailRes
  ) as any;
  const errors = (
    errorsRes && "data" in errorsRes ? errorsRes.data : errorsRes
  ) as any[] | undefined;

  const uploaderName = useMemo(() => {
    if (!upload?.uploader) return "—";
    return `${upload.uploader.first_name} ${upload.uploader.last_name}`;
  }, [upload?.uploader]);

  return (
    <AppShell>
      <PageHeader
        title="Student Upload"
        description="Inspect upload details and row errors."
      />

      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Upload Metadata</CardTitle>
            <CardDescription>Basic information</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <div>Loading upload…</div>
            ) : errorDetail || !upload ? (
              <div className="text-destructive">Failed to load upload</div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span> {upload.id}
                </div>
                <div>
                  <span className="text-muted-foreground">Uploaded At:</span>{" "}
                  {upload.uploaded_at
                    ? format(new Date(upload.uploaded_at), "PPpp")
                    : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Uploader:</span>{" "}
                  {uploaderName}
                </div>
                <div className="break-all">
                  <span className="text-muted-foreground">Storage Path:</span>{" "}
                  {upload.storage_path}
                </div>
                <div className="font-mono text-xs break-all">
                  <span className="text-muted-foreground">File Hash:</span>{" "}
                  {upload.file_hash}
                </div>
                {upload.signed_url && (
                  <div>
                    <Link href={upload.signed_url} target="_blank">
                      <Button size="sm">Download File</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Row Errors</CardTitle>
            <CardDescription>
              Validation and processing issues per row
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingErrors ? (
              <div>Loading errors…</div>
            ) : errorErrors ? (
              <div className="text-destructive">Failed to load errors</div>
            ) : !errors || errors.length === 0 ? (
              <div className="text-muted-foreground">
                No errors recorded for this upload.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Raw</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.row_number}</TableCell>
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
                        <TableCell>
                          {e.created_at
                            ? format(new Date(e.created_at), "PPpp")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
