"use client";

import { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { currentAdmin } from "@/lib/mock-data";
import { AdminTable } from "./data-table";
import { useAdmins } from "@/hooks/useAdmins";
import { useAdminActions } from "@/hooks/useAdminActions";
import { UIStateWrapper } from "@/components/ui-states/UIStateWrapper";
import type { Admin } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const adminFormSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address."),
  role: z.enum(["admin", "superadmin"]),
});

type AdminFormValues = z.infer<typeof adminFormSchema>;

export default function AdminManagementPage() {
  const [open, setOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionsPage, setActionsPage] = useState(1);

  const {
    data: admins,
    pagination,
    isLoading,
    error,
    refetch,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    promoteAdmin,
    isCreating,
    isUpdating,
    isDeleting,
    isPromoting,
  } = useAdmins({ page, search, limit: 10 });

  const {
    adminActions,
    isLoading: isLoadingActions,
    error: actionsError,
  } = useAdminActions(50, 0);

  const actionsPerPage = 6;
  const totalActionPages = Math.max(
    1,
    Math.ceil(adminActions.length / actionsPerPage)
  );
  const paginatedAdminActions = adminActions.slice(
    (actionsPage - 1) * actionsPerPage,
    actionsPage * actionsPerPage
  );

  useEffect(() => {
    if (actionsPage > totalActionPages) {
      setActionsPage(totalActionPages);
    }
  }, [actionsPage, totalActionPages]);

  const isSuperAdmin = currentAdmin.role === "superadmin";

  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminFormSchema),
  });

  const handleOpenDialog = (admin: Admin | null = null) => {
    setEditingAdmin(admin);
    if (admin) {
      form.reset(admin);
    } else {
      form.reset({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        role: "admin",
      });
    }
    setOpen(true);
  };

  const onSubmit = (data: AdminFormValues) => {
    if (editingAdmin) {
      updateAdmin({ id: editingAdmin.id, data });
    } else {
      createAdmin(data);
    }
    setOpen(false);
    form.reset();
  };

  const handleDelete = (admin: Admin) => {
    if (
      confirm(
        `Are you sure you want to delete ${admin.first_name} ${admin.last_name}?`
      )
    ) {
      deleteAdmin(admin.id);
    }
  };

  const handlePromote = (admin: Admin) => {
    if (admin.role === "superadmin") {
      return; // Already handled in the table component
    }
    promoteAdmin(admin.id);
  };

  return (
    <AppShell>
      <PageHeader
        title="Admin Management"
        description="View, manage, and promote administrators."
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isSuperAdmin}>
              <PlusCircle />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAdmin ? "Edit Admin" : "Add New Admin"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  name="first_name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="middle_name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="last_name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">Superadmin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isCreating || isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {isCreating || isUpdating
                      ? "Saving..."
                      : editingAdmin
                      ? "Save Changes"
                      : "Add Admin"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
        <div className="h-full">
          <UIStateWrapper
            isLoading={isLoading}
            error={error}
            data={admins}
            emptyTitle="No admins found"
            emptyMessage="No administrators have been created yet."
            emptyActionLabel="Add First Admin"
            onEmptyAction={() => handleOpenDialog()}
            onRetry={refetch}
          >
            <AdminTable
              data={admins}
              onEdit={handleOpenDialog}
              onDelete={handleDelete}
              onPromote={handlePromote}
              isSuperAdmin={isSuperAdmin}
              isDeleting={isDeleting}
              isPromoting={isPromoting}
            />
          </UIStateWrapper>
        </div>

        {/* Audit Logs Section */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Recent Admin Actions</CardTitle>
            <CardDescription>
              Track recent administrative actions and changes made by admins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UIStateWrapper
              isLoading={isLoadingActions}
              error={actionsError}
              data={adminActions}
              emptyTitle="No recent actions"
              emptyMessage="No administrative actions have been logged yet."
              onRetry={() => {}}
            >
              <div className="space-y-3">
                {paginatedAdminActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {action.action}
                        </Badge>
                        {action.object_type && (
                          <span className="text-sm text-muted-foreground">
                            {action.object_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium">
                        {action.object_label || "System Action"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {action.admin_name} •{" "}
                        {formatDistanceToNow(new Date(action.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {adminActions.length > actionsPerPage && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActionsPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={actionsPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {actionsPage} of {totalActionPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActionsPage((prev) =>
                        Math.min(totalActionPages, prev + 1)
                      )
                    }
                    disabled={actionsPage === totalActionPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </UIStateWrapper>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
