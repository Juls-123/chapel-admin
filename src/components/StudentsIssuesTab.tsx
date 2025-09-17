"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UIStateWrapper } from "@/components/ui-states/UIStateWrapper";
import { api } from "@/lib/requestFactory";
import Link from "next/link";
import { format } from "date-fns";

interface StudentIssue {
  id: string;
  row_number: number;
  error_type: string;
  error_message: string;
  raw_data: any;
  created_at: string | null;
  student_upload_id: string;
  upload?: {
    id: string;
    uploaded_at: string | null;
    uploaded_by: string;
    uploader?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    } | null;
  } | null;
}

export function StudentsIssuesTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading, isError, refetch } = useQuery<
    | {
        data?: StudentIssue[];
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }
    | StudentIssue[]
  >({
    queryKey: ["students-issues", { search, page, limit }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (search) sp.set("search", search);
      const res = await api.get<any>(`/api/students/issues?${sp.toString()}`);
      return res;
    },
  });

  const issues = useMemo(() => {
    if (!data) return [] as StudentIssue[];
    if (Array.isArray(data)) return data as StudentIssue[];
    return (data.data || []) as StudentIssue[];
  }, [data]);
  const pagination = !Array.isArray(data) ? data?.pagination : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Student Upload Issues
          <Badge variant="outline">students</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Search error message or upload id..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="max-w-sm"
          />
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        <UIStateWrapper
          isLoading={isLoading}
          error={isError ? new Error("Failed to load issues") : null}
          data={issues}
          emptyTitle="No issues found"
          emptyMessage="No issues match your current filters"
          onRetry={refetch}
          loadingMessage="Loading issues..."
        >
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Upload</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead>Row</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      {i.created_at
                        ? format(new Date(i.created_at), "PPpp")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/students/uploads/${i.student_upload_id}`}
                        className="underline underline-offset-2"
                      >
                        {i.student_upload_id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {i.upload?.uploader
                        ? `${i.upload.uploader.first_name} ${i.upload.uploader.last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono">{i.row_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {i.error_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[420px]">
                      <div className="truncate" title={i.error_message}>
                        {i.error_message}
                      </div>
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
    </Card>
  );
}
