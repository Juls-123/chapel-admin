"use client";

import Link from "next/link";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStudentUploads } from "@/hooks/useStudentUploads";
import { format } from "date-fns";

export default function StudentUploadsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError } = useStudentUploads({
    page,
    limit,
    search,
  });
  const rows = data?.data || [];
  const pagination = data?.pagination;

  return (
    <AppShell>
      <PageHeader
        title="Student Uploads"
        description="Inspect student upload batches and errors."
      />

      <Card>
        <CardHeader>
          <CardTitle>Uploads</CardTitle>
          <CardDescription>Search by file hash or storage path</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Search file hash or path..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead>File Hash</TableHead>
                  <TableHead>Storage Path</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5}>Loading...</TableCell>
                  </TableRow>
                )}
                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>Failed to load uploads</TableCell>
                  </TableRow>
                )}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No uploads found
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      {u.uploaded_at
                        ? format(new Date(u.uploaded_at), "PPpp")
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {u.file_hash}
                    </TableCell>
                    <TableCell className="text-xs break-all">
                      {u.storage_path}
                    </TableCell>
                    <TableCell>
                      {u.uploader
                        ? `${u.uploader.first_name} ${u.uploader.last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/students/uploads/${u.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
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
        </CardContent>
      </Card>
    </AppShell>
  );
}
