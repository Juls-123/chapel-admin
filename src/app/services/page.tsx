
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { services as initialServices, serviceConstraints } from '@/lib/mock-data';
import { ServiceTable } from './data-table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Service } from '@/lib/types';

const levels = [
    { id: 100, label: '100 Level' },
    { id: 200, label: '200 Level' },
    { id: 300, label: '300 Level' },
    { id: 400, label: '400 Level' },
    { id: 500, label: '500 Level' },
];

const serviceFormSchema = z.object({
  type: z.enum(['morning', 'evening', 'special'], { required_error: 'Please select a service type.' }),
  name: z.string().optional(),
  date: z.date({ required_error: 'A service date is required.' }),
  applicable_levels: z.array(z.number()).optional(),
  constraint: z.string().optional(),
}).refine((data) => {
    if (data.type === 'special') {
        return !!data.name && data.name.length > 0;
    }
    return true;
}, {
    message: 'A name is required for special services.',
    path: ['name'],
}).refine((data) => {
    if (data.type !== 'special') {
        return data.applicable_levels && data.applicable_levels.length > 0;
    }
    return true;
}, {
    message: 'At least one level must be selected for morning or evening services.',
    path: ['applicable_levels'],
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function ServiceManagementPage() {
    const [services, setServices] = useState<Service[]>(initialServices);
    const [open, setOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const { toast } = useToast();
    
    const form = useForm<ServiceFormValues>({
        resolver: zodResolver(serviceFormSchema),
        defaultValues: {
            type: 'morning',
            name: '',
            applicable_levels: [],
            constraint: 'none',
        }
    });

    useEffect(() => {
        if (editingService) {
            form.reset({
                type: editingService.type,
                name: editingService.name || '',
                date: new Date(editingService.date),
                applicable_levels: editingService.applicable_levels || [],
                constraint: editingService.constraint || 'none',
            });
        } else {
            form.reset({
                type: 'morning',
                name: '',
                date: undefined,
                applicable_levels: [],
                constraint: 'none',
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
        form.reset({ type: 'morning', name: '', date: undefined, applicable_levels: [] });
        setOpen(true);
    }

    const handleStatusChange = (serviceId: string, status: Service['status']) => {
        setServices(prevServices => 
            prevServices.map(service => 
                service.id === serviceId ? { ...service, status } : service
            )
        );
    };

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
            <DialogContent className="sm:max-w-lg">
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
                                <Select onValueChange={field.onChange} value={field.value}>
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

                        {serviceType !== 'special' ? (
                            <FormField
                                control={form.control}
                                name="applicable_levels"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-4">
                                            <FormLabel className="text-base">Applicable Levels</FormLabel>
                                            <FormDescription>
                                                Select the student levels required to attend this service.
                                            </FormDescription>
                                        </div>
                                        <div className="flex flex-wrap gap-4">
                                            {levels.map((item) => (
                                                <FormField
                                                    key={item.id}
                                                    control={form.control}
                                                    name="applicable_levels"
                                                    render={({ field }) => {
                                                        return (
                                                        <FormItem
                                                            key={item.id}
                                                            className="flex flex-row items-start space-x-3 space-y-0"
                                                        >
                                                            <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(item.id)}
                                                                onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value || []), item.id])
                                                                    : field.onChange(
                                                                        field.value?.filter(
                                                                        (value) => value !== item.id
                                                                        )
                                                                    )
                                                                }}
                                                            />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">
                                                                {item.label}
                                                            </FormLabel>
                                                        </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <FormField
                                control={form.control}
                                name="constraint"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Constraints</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a constraint" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {serviceConstraints.map(constraint => (
                                                    <SelectItem key={constraint.id} value={constraint.id}>{constraint.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Apply special rules for this service.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button type="submit">{editingService ? 'Save Changes' : 'Create Service'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

      <div className="grid gap-6">
        <ServiceTable data={services} onEdit={handleEdit} onStatusChange={handleStatusChange} />
      </div>
    </AppShell>
  );
}
