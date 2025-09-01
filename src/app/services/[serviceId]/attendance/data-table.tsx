
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
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
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
import type { AttendanceRecord } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function AttendanceTable({ data }: { data: AttendanceRecord[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const getInitials = (studentName: string) => {
    const names = studentName.split(" ");
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return names[0]?.[0] || '';
  }

  const columns: ColumnDef<AttendanceRecord>[] = [
      {
          accessorKey: 'student_name',
          header: 'Student',
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
          accessorKey: 'scanned_at',
          header: 'Time Scanned',
          cell: ({ row }) => {
            const record = row.original;
            if (record.status !== 'present') return <span className="text-muted-foreground">—</span>;
            return <div>{format(new Date(row.getValue('scanned_at')), 'p')}</div>
          },
      },
      {
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => {
              const status = row.getValue('status') as AttendanceRecord['status'];
              const statusConfig = {
                  present: { label: "Present", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
                  absent: { label: "Absent", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
                  exempted: { label: "Exempted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300" },
              }
              return (
                  <Badge variant="outline" className={cn("border-0 capitalize", statusConfig[status].color)}>
                      {statusConfig[status].label}
                  </Badge>
              )
          }
      },
      {
          accessorKey: 'exemption_reason',
          header: 'Exemption Info',
          cell: ({row}) => {
            const record = row.original;
            if (record.status !== 'exempted') return <span className="text-muted-foreground">—</span>;
            return <span className="capitalize">{record.exemption_reason?.replace('_', ' ')}</span>
          }
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
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="exempted">Exempted</SelectItem>
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
                  No attendance records found for this service.
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
  );
}
