"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Row,
} from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { WarningLetterSummary, WarningStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StudentProfileModal } from "@/components/StudentProfileModal";
import { Skeleton } from "@/components/ui/skeleton";

type WarningLettersTableProps = {
  data: WarningLetterSummary[];
  onRowSelect: (student: WarningLetterSummary) => void;
  onUpdateStatus: (matricNumber: string, status: WarningStatus) => void;
  selectedRowId?: string | null;
  isLoading?: boolean;
};

export function WarningLettersTable({
  data = [],
  onRowSelect,
  onUpdateStatus,
  selectedRowId = null,
  isLoading = false,
}: WarningLettersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localSelectedRowId, setLocalSelectedRowId] = useState<string | null>(
    selectedRowId
  );
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getInitials = (studentName: string) => {
    const names = studentName.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return names[0]?.[0] || "";
  };

  const handleRowClick = (row: Row<WarningLetterSummary>) => {
    const student = row.original;
    setLocalSelectedRowId(student.matric_number);
    onRowSelect(student);
  };

  const handleViewProfile = (matricNumber: string) => {
    setSelectedStudent(matricNumber);
    setIsModalOpen(true);
  };

  const handleResend = (summary: WarningLetterSummary) => {
    onUpdateStatus(summary.matric_number, "sent");
  };

  const handleDownloadPDF = (summary: WarningLetterSummary) => {
    // This would be implemented by the parent component
    console.log("Download PDF for:", summary.matric_number);
  };

  const columns: ColumnDef<WarningLetterSummary>[] = [
    {
      accessorKey: "student_name",
      header: "Student",
      cell: ({ row }) => {
        const summary = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {getInitials(summary.student_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{summary.student_name}</span>
              <span className="text-sm text-muted-foreground">
                {summary.matric_number}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "miss_count",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            column.toggleSorting(column.getIsSorted() === "asc");
          }}
        >
          Miss Count
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">{row.getValue("miss_count")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = (row.getValue("status") as WarningStatus) || "none";
        const statusConfig = {
          none: {
            label: "None",
            color:
              "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
          },
          pending: {
            label: "Pending",
            color:
              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
          },
          sent: {
            label: "Sent",
            color:
              "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
          },
        };

        const config = statusConfig[status] || statusConfig.none;

        return (
          <Badge
            variant="outline"
            className={cn("border-0 capitalize", config.color)}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const summary = row.original;
        const isPending = summary.status === "pending";

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResend(summary);
                  }}
                  disabled={!isPending}
                >
                  Mark as Sent
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPDF(summary);
                  }}
                >
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(summary.matric_number);
                  }}
                >
                  View Student Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <StudentProfileModal
        studentId={selectedStudent || ""}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={
                        localSelectedRowId === row.original.matric_number
                          ? "selected"
                          : ""
                      }
                      onClick={() => handleRowClick(row)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No pending warnings for this week.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
