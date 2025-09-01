
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
import { MoreHorizontal, ArrowUpDown, Calendar as CalendarIcon, Download, CheckCircle } from 'lucide-react';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Service } from '@/lib/types';
import { attendanceRecords } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type ServiceTableProps = {
    data: Service[];
    onEdit: (service: Service) => void;
    onStatusChange: (serviceId: string, status: Service['status']) => void;
};

const downloadCSV = (data: any[], filename: string) => {
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = (''+row[header]).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

const handleDownloadAttendance = (serviceId: string, serviceName: string) => {
    const records = attendanceRecords.filter(r => r.service_id === serviceId);
    if(records.length > 0) {
        downloadCSV(records, `${serviceName}_attendance.csv`);
    } else {
        alert('No attendance records found for this service.');
    }
};

export function ServiceTable({ data, onEdit, onStatusChange }: ServiceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();

  const handleCompleteService = (service: Service) => {
    onStatusChange(service.id, 'completed');
    toast({
      title: 'Service Completed',
      description: `${service.name || service.type} has been marked as completed.`
    })
  }

  const columns: ColumnDef<Service>[] = [
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const service = row.original;
        const isSpecial = service.type === 'special';
        return (
          <div className="flex flex-col">
            <span className="font-medium capitalize">{isSpecial ? service.name : service.type}</span>
            {isSpecial && <span className="text-xs text-muted-foreground">Special Service</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">
          {format(new Date(row.getValue('date')), 'PPP')}
          <div className="text-sm text-muted-foreground">
            {format(new Date(row.getValue('date')), 'p')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
          const status = row.getValue('status') as Service['status'];
          const statusConfig = {
              upcoming: { label: "Upcoming", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
              active: { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
              completed: { label: "Completed", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300" },
              cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
          }
          return (
              <Badge variant="outline" className={cn("border-0 capitalize", statusConfig[status].color)}>
                  {statusConfig[status].label}
              </Badge>
          )
      }
    },
    {
      accessorKey: 'created_by',
      header: 'Created By',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const service = row.original;
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
                  <DropdownMenuItem onClick={() => onEdit(service)}>Edit Service</DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handleCompleteService(service)} disabled={service.status !== 'active'}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete Service
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDownloadAttendance(service.id, service.name || service.type)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Attendance
                  </DropdownMenuItem>
                  <DropdownMenuItem>View Attendees</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  Cancel Service
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
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Filter by name..."
              value={(table.getColumn('type')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('type')?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <Select onValueChange={(value) => table.getColumn('status')?.setFilterValue(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !table.getColumn('date')?.getFilterValue() && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {table.getColumn('date')?.getFilterValue() ? (
                        format(table.getColumn('date')?.getFilterValue() as Date, "PPP")
                        ) : (
                        <span>Pick a date</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={table.getColumn('date')?.getFilterValue() as Date}
                    onSelect={(date) => table.getColumn('date')?.setFilterValue(date)}
                    initialFocus
                />
                </PopoverContent>
            </Popover>
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
  );
}
