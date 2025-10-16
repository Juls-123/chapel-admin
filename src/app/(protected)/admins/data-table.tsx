// src/app/admins/data-table.tsx
"use client";

import { MoreHorizontal, ShieldCheck, Trash2, Edit } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Admin } from "@/lib/types";

type AdminTableProps = {
  data: Admin[];
  onEdit: (admin: Admin) => void;
  onDelete: (admin: Admin) => void;
  onPromote: (admin: Admin) => void;
  isSuperAdmin: boolean;
  isDeleting?: boolean;
  isPromoting?: boolean;
};

export function AdminTable({
  data,
  onEdit,
  onDelete,
  onPromote,
  isSuperAdmin,
  isDeleting,
  isPromoting,
}: AdminTableProps) {
  const columns: ColumnDef<Admin>[] = [
    {
      accessorKey: "email",
      header: "Admin",
      cell: ({ row }) => {
        const admin = row.original;
        const fullName = `${admin.first_name} ${admin.last_name}`;
        return (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-medium">{fullName}</span>
              <span className="text-sm text-muted-foreground">
                {admin.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <Badge
            variant={role === "superadmin" ? "default" : "secondary"}
            className={cn(role === "superadmin" ? "bg-primary" : "")}
          >
            {role}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const admin = row.original;
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(admin)}
              disabled={!isSuperAdmin}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPromote(admin)}
              disabled={
                !isSuperAdmin || admin.role === "superadmin" || isPromoting
              }
            >
              <ShieldCheck className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(admin)}
              disabled={!isSuperAdmin || isDeleting}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="email"
      searchPlaceholder="Filter admins..."
      showPagination={true}
    />
  );
}
