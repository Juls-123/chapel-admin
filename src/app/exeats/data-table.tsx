
"use client";

import { useState } from 'react';
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
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
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
import type { Exeat, StudentWithRecords } from '@/lib/types';
import { students, attendanceRecords } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StudentProfileModal } from '@/components/StudentProfileModal';

export function ExeatTable({ data }: { data: Exeat[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithRecords | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewProfile = (matricNumber: string) => {
    const student = students.find(s => s.matric_number === matricNumber);
    if (student) {
      const records = attendanceRecords.filter(r => r.matric_number === matricNumber);
      setSelectedStudent({ ...student, attendance: records });
      setIsModalOpen(true);
    }
  };

  const columns: ColumnDef<Exeat>[] = [
      {
          accessorKey: 'student_name',
          header: 'Student',
          cell: ({ row }) => (
              <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                      <AvatarFallback>
                          {row.original.student_name.split(" ").map(n => n[0]).join("")}
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
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => {
              const status = row.getValue('status') as Exeat['status'];
              const statusConfig = {
                  active: { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
                  upcoming: { label: "Upcoming", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
                  past: { label: "Past", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300" },
              }
              return (
                  <Badge variant="outline" className={cn("border-0 capitalize", statusConfig[status].color)}>
                      {statusConfig[status].label}
                  </Badge>
              )
          }
      },
      {
          id: 'actions',
          cell: ({ row }) => (
              <div className="text-right">
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewProfile(row.original.matric_number)}>
                        View Student Profile
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          )
      }
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <>
      <StudentProfileModal 
        student={selectedStudent} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
              <Input
                placeholder="Filter by student..."
                value={(table.getColumn('student_name')?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn('student_name')?.setFilterValue(event.target.value)
                }
                className="max-w-full md:max-w-sm"
              />
              <Select onValueChange={(value) => table.getColumn('status')?.setFilterValue(value === 'all' ? '' : value)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
              </Select>
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
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
          </div>
        </CardContent>
      </Card>
    </>
  );
}
