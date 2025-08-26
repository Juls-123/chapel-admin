
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Student, StudentWithRecords } from '@/lib/types';
import { attendanceRecords } from '@/lib/mock-data';
import { StudentProfileModal } from '@/components/StudentProfileModal';

export function StudentTable({ data }: { data: Student[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithRecords | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewProfile = (matricNumber: string) => {
    const student = data.find(s => s.matric_number === matricNumber);
    if (student) {
      const records = attendanceRecords.filter(r => r.matric_number === matricNumber);
      setSelectedStudent({ ...student, attendance: records });
      setIsModalOpen(true);
    }
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'full_name',
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
                      {row.original.full_name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                  <span className="font-medium">{row.original.full_name}</span>
                  <span className="text-sm text-muted-foreground">{row.original.matric_number}</span>
              </div>
          </div>
      )
    },
    {
      accessorKey: 'email',
      header: 'Email',
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
                      View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>Edit Student</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      Delete Student
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
            <div className="flex items-center">
              <Input
                placeholder="Filter by name, matric number, or email..."
                value={(table.getColumn('full_name')?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn('full_name')?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
              />
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
