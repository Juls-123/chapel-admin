
"use client";

import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { services } from '@/lib/mock-data';
import { ServiceTable } from './data-table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Service } from '@/lib/types';

const serviceFormSchema = z.object({
  type: z.enum(['morning', 'evening', 'special'], { required_error: 'Please select a service type.' }),
  name: z.string().optional(),
  date: z.date({ required_error: 'A service date is required.' }),
}).refine((data) => {
    if (data.type === 'special') {
        return !!data.name && data.name.length > 0;
    }
    return true;
}, {
    message: 'A name is required for special services.',
    path: ['name'],
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function ServiceManagementPage() {
    const [open, setOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const { toast } = useToast();
    
    const form = useForm<ServiceFormValues>({
        resolver: zodResolver(serviceFormSchema),
        defaultValues: {
            type: 'morning',
            name: '',
        }
    });

    useEffect(() => {
        if (editingService) {
            form.reset({
                type: editingService.type,
                name: editingService.name || '',
                date: new Date(editingService.date),
            });
        } else {
            form.reset({
                type: 'morning',
                name: '',
                date: undefined,
            });
        }
    }, [editingService, form]);
    
    const serviceType = form.watch('type');

    function onSubmit(data: ServiceFormValues) {
        if (editingService) {
            console.log("Updating service:", { ...editingService, ...data });
            toast({
                title: "Service Updated",
                description: "The service has been successfully updated.",
            });
        } else {
            console.log("Creating service:", data);
            toast({
                title: "Service Created",
                description: "The new service has been successfully scheduled.",
            });
        }
        setOpen(false);
        setEditingService(null);
        form.reset();
    }

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setOpen(true);
    };
    
    const handleCreate = () => {
        setEditingService(null);
        setOpen(true);
    }

  return (
    <AppShell>
      <PageHeader
        title="Service Management"
        description="View, create, and manage all chapel services."
      >
        <Button onClick={handleCreate}>
            <PlusCircle />
            Create Service
        </Button>
      </PageHeader>

      <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
              setEditingService(null);
          }
      }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingService ? 'Edit Service' : 'Create New Service'}</DialogTitle>
                    <DialogDescription>
                        {editingService ? 'Update the details of this service.' : 'Schedule a new chapel service for attendance tracking.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Service Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a service type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="morning">Morning</SelectItem>
                                        <SelectItem value="evening">Evening</SelectItem>
                                        <SelectItem value="special">Special</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        {serviceType === 'special' && (
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Founder's Day" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Date & Time</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "PPP p")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                            date < new Date(new Date().setHours(0,0,0,0))
                                        }
                                        initialFocus
                                    />
                                    <div className="p-3 border-t border-border">
                                        <Input
                                            type="time"
                                            defaultValue={field.value ? format(field.value, 'HH:mm') : ''}
                                            onChange={(e) => {
                                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                                const newDate = new Date(field.value || new Date());
                                                newDate.setHours(hours, minutes);
                                                field.onChange(newDate);
                                            }}
                                        />
                                    </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">{editingService ? 'Save Changes' : 'Create Service'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

      <div className="grid gap-6">
        <ServiceTable data={services} onEdit={handleEdit} />
      </div>
    </AppShell>
  );
}
