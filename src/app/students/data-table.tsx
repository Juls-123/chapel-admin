
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
  type VisibilityState,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, PauseCircle, PlayCircle } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Student, StudentWithRecords } from '@/lib/types';
import { attendanceRecords } from '@/lib/mock-data';
import { StudentProfileModal } from '@/components/StudentProfileModal';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function StudentTable({ data }: { data: Student[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithRecords | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleViewProfile = (matricNumber: string) => {
    const student = data.find(s => s.matric_number === matricNumber);
    if (student) {
      const records = attendanceRecords.filter(r => r.matric_number === matricNumber);
      setSelectedStudent({ ...student, attendance: records });
      setIsModalOpen(true);
    }
  };

  const handleTogglePause = (student: Student) => {
      const newStatus = student.status === 'active' ? 'paused' : 'active';
      // Here you would typically make an API call to update the student's status
      console.log(`Setting student ${student.matric_number} to ${newStatus}`);
      toast({
          title: `Student ${newStatus === 'active' ? 'Resumed' : 'Paused'}`,
          description: `${student.full_name} has been ${newStatus}.`,
      });
      // For the sake of this demo, we won't be updating the state directly.
      // In a real app, you'd refetch the data or update the local state.
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
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as Student['status'];
            return (
                <Badge variant={status === 'active' ? 'default' : 'secondary'} className={cn(status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800', "border-0")}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
            );
        }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
          const student = row.original;
          return (
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
                      <DropdownMenuItem onClick={() => handleViewProfile(student.matric_number)}>
                          View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit Student</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleTogglePause(student)}>
                          {student.status === 'active' ? (
                              <><PauseCircle className="mr-2 h-4 w-4" /> Pause Student</>
                          ) : (
                              <><PlayCircle className="mr-2 h-4 w-4" /> Resume Student</>
                          )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          Delete Student
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          )
      }
    }
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection: {},
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
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
                value={globalFilter ?? ''}
                onChange={(event) =>
                  setGlobalFilter(event.target.value)
                }
                className="max-w-sm"
              />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        )
                      })}
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
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
