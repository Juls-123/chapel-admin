
"use client";

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { admins as initialAdmins, currentAdmin } from '@/lib/mock-data';
import { AdminTable } from './data-table';
import { useToast } from '@/hooks/use-toast';
import type { Admin } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const adminFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required.'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Invalid email address.'),
  role: z.enum(['admin', 'superadmin']),
});

type AdminFormValues = z.infer<typeof adminFormSchema>;


export default function AdminManagementPage() {
    const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
    const [open, setOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
    const { toast } = useToast();
    
    const isSuperAdmin = currentAdmin.role === 'superadmin';

    const form = useForm<AdminFormValues>({
        resolver: zodResolver(adminFormSchema),
    });

    const handleOpenDialog = (admin: Admin | null = null) => {
        setEditingAdmin(admin);
        if (admin) {
            form.reset(admin);
        } else {
            form.reset({
                first_name: '',
                middle_name: '',
                last_name: '',
                email: '',
                role: 'admin',
            });
        }
        setOpen(true);
    };

    const onSubmit = (data: AdminFormValues) => {
        if (editingAdmin) {
            // Update admin logic
            console.log("Updating admin:", { ...editingAdmin, ...data });
            toast({
                title: "Admin Updated",
                description: "The admin's details have been updated.",
            });
        } else {
            // Add new admin logic
            console.log("Creating admin:", data);
            toast({
                title: "Admin Added",
                description: "The new admin has been successfully created.",
            });
        }
        setOpen(false);
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
                    <DialogTitle>{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField name="first_name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="middle_name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Middle Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="last_name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="email" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <Button type="submit">{editingAdmin ? 'Save Changes' : 'Add Admin'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="grid gap-6">
        <AdminTable data={admins} onEdit={handleOpenDialog} isSuperAdmin={isSuperAdmin} />
      </div>
    </AppShell>
  );
}
