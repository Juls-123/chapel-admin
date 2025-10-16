"use client";

import { useState, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Eye, X } from "lucide-react";
import { format } from "date-fns";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { StudentProfileModal } from "@/components/StudentProfileModal";
import { useExeats, type Exeat } from "@/hooks/useExeats";
import { useToast } from "@/hooks/use-toast";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  limit: number;
  total: number;
}

interface ExeatTableProps {
  data: Exeat[];
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
  onStatusFilter?: (status: 'active' | 'past' | 'canceled' | undefined) => void;
}

export function ExeatTable({
  data,
  pagination,
  onPageChange,
  onSearch,
  onStatusFilter,
}: ExeatTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { toast } = useToast();
  const { cancelExeat, isCancelling } = useExeats();

  const handleViewProfile = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsModalOpen(true);
  };

  const handleCancelExeat = (exeat: Exeat) => {
    if (exeat.status === "canceled") {
      toast({
        title: "Already Canceled",
        description: "This exeat has already been canceled.",
        variant: "destructive",
      });
      return;
    }

    cancelExeat(exeat.id, {
      onSuccess: () => {
        toast({
          title: "Exeat Cancelled",
          description: "The exeat has been successfully cancelled.",
        });
      },
    });
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearch]);

  // Status filter
  useEffect(() => {
    const statusMap: Record<string, 'active' | 'past' | 'canceled' | undefined> = {
      all: undefined,
      active: 'active',
      past: 'past',
      canceled: 'canceled',
    };

    const status = statusMap[statusFilter];
    onStatusFilter?.(status);
  }, [statusFilter, onStatusFilter]);

  // Table columns
  const columns: ColumnDef<Exeat>[] = [
    {
      accessorKey: "student_name",
      header: "Student",
      cell: ({ row }) => {
        const exeat = row.original;
        const initials = exeat.student_name
          .split(" ")
          .map((n) => n[0])
          .join("");
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{exeat.student_name}</div>
              <div className="text-sm text-muted-foreground">
                {exeat.matric_number}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => row.original.level ?? "—",
    },
    {
      accessorKey: "start_date",
      header: "Start Date",
      cell: ({ row }) =>
        format(new Date(row.original.start_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "end_date",
      header: "End Date",
      cell: ({ row }) =>
        format(new Date(row.original.end_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) =>
        format(new Date(row.original.created_at), "MMM dd, yyyy"),
    },
    {
      accessorKey: "derived_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.derived_status;

        const variantMap: Record<
          Exeat["derived_status"],
          BadgeProps["variant"]
        > = {
          active: "default",
          past: "outline",
          canceled: "destructive",
        };

        const variant = variantMap[status] ?? "default";

        const labels: Record<Exeat["derived_status"], string> = {
          active: "Active",
          past: "Past",
          canceled: "Canceled",
        };

        return <Badge variant={variant}>{labels[status]}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const exeat = row.original;
        const isCanceled = exeat.status === "canceled";
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="View Student Profile"
              onClick={() => handleViewProfile(exeat.student_id)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {!isCanceled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelExeat(exeat)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                title="Cancel Exeat"
                disabled={isCancelling}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages || 1,
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex: (pagination?.currentPage || 1) - 1,
        pageSize: pagination?.limit || 10,
      },
    },
  });

  return (
    <>
      <StudentProfileModal
        studentId={selectedStudentId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search + Filters */}
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  placeholder="Search by student name or matric number..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="max-w-full md:max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {pagination && (
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.currentPage - 1) * pagination.limit + 1}{" "}
                  to{" "}
                  {Math.min(
                    pagination.currentPage * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} exeats
                </div>
              )}
            </div>

            {/* Table */}
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
                        data-state={row.getIsSelected() && "selected"}
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
                        No exeats found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(1)}
                    disabled={pagination.currentPage === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                  >
                    Previous
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
