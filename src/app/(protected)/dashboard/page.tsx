"use client";

import { useState } from "react";
import { Activity, PlusCircle, FileUp, CalendarClock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminActions } from "@/hooks/useAdminActions";
import { UIStateWrapper } from "@/components/ui-states/UIStateWrapper";

const quickActions = [
  {
    title: "Create Service",
    description: "Schedule a new chapel service",
    icon: PlusCircle,
    href: "/services",
    variant: "default" as const,
  },
  {
    title: "Upload Attendance",
    description: "Upload scanned attendance sheets",
    icon: FileUp,
    href: "/attendance",
    variant: "outline" as const,
  },
  {
    title: "Manage Exeats",
    description: "View and approve exeat requests",
    icon: CalendarClock,
    href: "/exeats",
    variant: "outline" as const,
  },
  {
    title: "Reports",
    description: "Generate Absentee reports",
    icon: Activity,
    href: "/absentees",
    variant: "outline" as const,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");

  const { adminActions, isLoading, error } = useAdminActions(50, 0);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "admin_name",
      header: "Admin",
      cell: ({ row }) => {
        const action = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-medium">{action.admin_name}</span>
              <Badge variant="outline" className="text-xs w-fit">
                {action.action}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "object_type",
      header: "Action",
      cell: ({ row }) => {
        const action = row.original;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {action.object_type && (
                <span className="text-sm text-muted-foreground">
                  {action.object_type}
                </span>
              )}
            </div>
            {action.object_label && (
              <p className="text-sm font-medium">{action.object_label}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.original.created_at);
        return (
          <div className="text-right">
            <div className="text-sm font-medium">
              {date.toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(date, { addSuffix: true })}
            </div>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: adminActions,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description={`Welcome back! Here's a summary for ${format(
          new Date(),
          "EEEE, MMMM d, yyyy"
        )}.`}
      />

      <div className="grid gap-6">
        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card
              key={action.title}
              className="transition-all hover:shadow-md cursor-pointer"
              onClick={() => router.push(action.href)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-lg",
                      action.variant === "default"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted"
                    )}
                  >
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Track recent admin actions and system events
                </CardDescription>
              </div>
              <div className="w-full max-w-sm">
                <input
                  type="text"
                  placeholder="Filter actions..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <UIStateWrapper
              isLoading={isLoading}
              error={error}
              data={adminActions}
              emptyTitle="No recent activity"
              emptyMessage="No administrative actions have been logged yet."
              onRetry={() => {}}
            >
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
                          No recent activity found.
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
            </UIStateWrapper>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
