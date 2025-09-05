
"use client";

import { useState, useEffect } from 'react';
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
} from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Eye, Edit, X } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Exeat, StudentWithRecords, Student, PaginationInfo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StudentProfileModal } from '@/components/StudentProfileModal';
import { useExeats } from '@/hooks/useExeats';
import { useToast } from '@/hooks/use-toast';

interface ExeatTableProps {
  data: Exeat[];
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
  onStatusFilter?: (status: 'active' | 'ended' | 'canceled' | undefined) => void;
}

export function ExeatTable({ 
  data, 
  pagination, 
  onPageChange, 
  onSearch, 
  onStatusFilter 
}: ExeatTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { toast } = useToast();
  const { cancelExeat, isLoading: isCancelling, isUpdating } = useExeats();

  const getInitials = (studentName: string) => {
    const names = studentName.split(" ");
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return names[0][0] || '';
  }

  const handleViewProfile = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsModalOpen(true);
  };

  const handleEditExeat = (exeat: Exeat) => {
    // TODO: Implement edit functionality
    toast({
      title: "Feature Coming Soon", 
      description: "Edit exeat functionality will be implemented soon.",
    });
  };

  const handleCancelExeat = (exeat: Exeat) => {
    if (exeat.status === 'canceled') {
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
      }
    });
  };

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearch]);

  // Handle status filter
  useEffect(() => {
    const status = statusFilter === 'all' ? undefined : statusFilter as 'active' | 'ended' | 'canceled';
    onStatusFilter?.(status);
  }, [statusFilter, onStatusFilter]);

  const columns: ColumnDef<Exeat>[] = [
      {
          accessorKey: 'student_name',
          header: ({ column }) => (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                Student
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
          ),
          cell: ({ row }) => (
              <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                      <AvatarFallback>
                          {getInitials(row.original.student_name)}
                      </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                      <span className="font-medium">{row.original.student_name}</span>
                      <span className="text-sm text-muted-foreground">{row.original.matric_number}</span>
                  </div>
              </div>
          )
      },
      {
          accessorKey: 'start_date',
          header: ({ column }) => (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                Start Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
          ),
          cell: ({ row }) => (
              <div>{format(new Date(row.getValue('start_date')), 'PPP')}</div>
          ),
      },
      {
          accessorKey: 'end_date',
          header: ({ column }) => (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                End Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
          ),
          cell: ({ row }) => (
              <div>{format(new Date(row.getValue('end_date')), 'PPP')}</div>
          ),
      },
      {
          accessorKey: 'reason',
          header: 'Reason',
          cell: ({ row }) => {
              const reason = row.getValue('reason') as string;
              return (
                  <div className="max-w-[200px] truncate" title={reason || 'No reason provided'}>
                      {reason || <span className="text-muted-foreground italic">No reason</span>}
                  </div>
              );
          }
      },
      {
          accessorKey: 'status',
          header: ({ column }) => (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                Status
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
          ),
          cell: ({ row }) => {
              const status = row.getValue('status') as Exeat['status'];
              const statusConfig = {
                  active: { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
                  ended: { label: "Ended", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300" },
                  canceled: { label: "Canceled", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
              }
              return (
                  <Badge variant="outline" className={cn("border-0 capitalize", statusConfig[status]?.color)}>
                      {statusConfig[status]?.label || status}
                  </Badge>
              )
          }
      },
      {
          accessorKey: 'created_at',
          header: ({ column }) => (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                Created
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
          ),
          cell: ({ row }) => (
              <div className="text-sm text-muted-foreground">
                  {format(new Date(row.getValue('created_at')), 'MMM dd, yyyy')}
              </div>
          ),
      },
      {
          id: 'actions',
          header: 'Actions',
          cell: ({ row }) => {
              const exeat = row.original;
              const isActive = exeat.status === 'active';
              const isCanceled = exeat.status === 'canceled';
              
              return (
                  <div className="flex items-center gap-2">
                      <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProfile(exeat.student_id)}
                          className="h-8 w-8 p-0"
                          title="View Student Profile"
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
                              disabled={isCancelling || exeat.status === 'canceled'}
                          >
                              <X className="h-4 w-4" />
                          </Button>
                      )}
                  </div>
              )
          }
      }
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true, // Use server-side pagination
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
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  placeholder="Search by student name or matric number..."
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="max-w-full md:max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              {pagination && (
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} exeats
                </div>
              )}
            </div>
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
                        data-state={row.getIsSelected() && 'selected'}
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
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
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
