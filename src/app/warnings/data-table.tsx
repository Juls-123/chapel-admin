"use client";

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { WarningLetterSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


type WarningLettersTableProps = {
    data: WarningLetterSummary[];
    onRowSelect: (student: WarningLetterSummary) => void;
};

const columns: ColumnDef<WarningLetterSummary>[] = [
    {
        accessorKey: 'student_name',
        header: 'Student',
        cell: ({ row }) => {
            const summary = row.original;
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>
                            {summary.student_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium">{summary.student_name}</span>
                        <span className="text-sm text-muted-foreground">{summary.matric_number}</span>
                    </div>
                </div>
            )
        }
    },
    {
        accessorKey: 'miss_count',
        header: ({ column }) => (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Miss Count
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="text-center">{row.getValue('miss_count')}</div>
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as WarningLetterSummary['status'];
            const statusConfig = {
                pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300" },
                sent: { label: "Sent", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
                failed: { label: "Failed", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
                overridden: { label: "Overridden", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300" },
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
                    <DropdownMenuItem>Resend Letter</DropdownMenuItem>
                    <DropdownMenuItem>Override Warning</DropdownMenuItem>
                    <DropdownMenuItem>View History</DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )
    }
];

export function WarningLettersTable({ data, onRowSelect }: WarningLettersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(data.length > 0 ? data[0].matric_number : null);

  const handleRowClick = (row: any) => {
    const student = row.original as WarningLetterSummary;
    setSelectedRowId(student.matric_number);
    onRowSelect(student);
  };
  
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
  });

  return (
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
                    data-state={selectedRowId === (row.original as WarningLetterSummary).matric_number && 'selected'}
                    onClick={() => handleRowClick(row)}
                    className="cursor-pointer"
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
      </CardContent>
    </Card>
  );
}
