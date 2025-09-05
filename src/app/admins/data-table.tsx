
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
} from '@tanstack/react-table';
import { MoreHorizontal, ShieldCheck, Trash2, Edit, CheckSquare } from 'lucide-react';
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
import type { Admin } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type AdminTableProps = {
    data: Admin[];
    onEdit: (admin: Admin) => void;
    onDelete: (admin: Admin) => void;
    onPromote: (admin: Admin) => void;
    isSuperAdmin: boolean;
    isDeleting?: boolean;
    isPromoting?: boolean;
};

const getFullName = (admin: Admin) => `${admin.first_name} ${admin.last_name}`;

export function AdminTable({ data, onEdit, onDelete, onPromote, isSuperAdmin, isDeleting, isPromoting }: AdminTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const handlePromote = (admin: Admin) => {
    if (admin.role === 'superadmin') {
        toast({ title: 'Already a Superadmin', variant: 'destructive' });
        return;
    }
    onPromote(admin);
  };
  
  const handleDelete = (admin: Admin) => {
    onDelete(admin);
  };

  const columns: ColumnDef<Admin>[] = [
    {
      accessorKey: 'full_name',
      header: 'Admin',
      cell: ({ row }) => {
          const admin = row.original;
          const fullName = getFullName(admin);
          const initials = `${admin.first_name[0]}${admin.last_name[0]}`;
          return (
              <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                      <AvatarFallback>
                          {initials}
                      </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                      <span className="font-medium">{fullName}</span>
                      <span className="text-sm text-muted-foreground">{admin.email}</span>
                  </div>
              </div>
          )
      },
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    },
    {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
            const role = row.getValue('role') as Admin['role'];
            return (
                <Badge variant={role === 'superadmin' ? 'default' : 'secondary'} className={cn(role === 'superadmin' ? 'bg-primary text-primary-foreground' : '', "capitalize")}>
                    {role}
                </Badge>
            );
        }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
          const admin = row.original;
          return (
              <div className="text-right">
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={!isSuperAdmin}>
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(admin)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                          onClick={() => handlePromote(admin)} 
                          disabled={admin.role === 'superadmin' || isPromoting}
                      >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {isPromoting ? 'Promoting...' : 'Promote to Superadmin'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => handleDelete(admin)}
                          disabled={isDeleting}
                      >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting ? 'Deleting...' : 'Delete Admin'}
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
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center">
            <Input
              placeholder="Filter by name or email..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
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
                    <TableRow key={row.id}>
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
  );
}
